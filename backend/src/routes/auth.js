import { privatePrisma } from '../lib/prismaClients.js';
import { publicUserSelect } from '../lib/prismaSelects.js';
import bcrypt from 'bcrypt';

export default async function (fastify, opts) {
    // ROUTE: Creates a new user account.
    fastify.post('/register', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    displayName: { type: 'string', minLength: 3, maxLength: 20 },
                    email: { type: 'string', format: 'email', maxLength: 100 },
                    password: { type: 'string', minLength: 6, maxLength: 100 }
                },
                required: ['displayName', 'email', 'password']
            },
            response: {
                201: { $ref: 'publicUser#' },
                409: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { displayName, email, password } = request.body;

            // Check for existing user with Prisma (case-insensitive)
            const existingUserByDisplayName = await fastify.prisma.user.findFirst({
                where: {
                    displayName: {
                        equals: displayName
                    }
                }
            });

            if (existingUserByDisplayName) {
                throw fastify.httpErrors.conflict('Display name is already in use.');
            }

            const existingUserByEmail = await fastify.prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                select: { id: true }
            });

            if (existingUserByEmail) {
                throw fastify.httpErrors.conflict('An account with this email already exists.');
            }

            // Hash the password before storing it
            const passwordHash = await bcrypt.hash(password, 10);

            // Create the new user with Prisma
            const newUser = await fastify.prisma.user.create({
                data: {
                    displayName,
                    email: email.toLowerCase(),
                    passwordHash
                }
            });

            reply.code(201);
            return newUser;

        } catch (error) {
            fastify.log.error(error, 'Registration failed');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred during registration.');
        }
    });

    // ROUTE: Logs in the host user and returns a JWT token.
    fastify.post('/login', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email', maxLength: 100 },
                    password: { type: 'string', minLength: 6, maxLength: 100 }
                },
                required: ['email', 'password']
            },
            response: {
                200: { $ref: 'publicUser#' },
                401: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { email, password } = request.body;

            // Find the user by email using the PRIVATE client to get the password hash.
            const hostWithSecrets = await privatePrisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });

            // Verify the password.
            const isPasswordValid = hostWithSecrets && await bcrypt.compare(password, hostWithSecrets.passwordHash);

            if (!isPasswordValid) {
                throw fastify.httpErrors.unauthorized('Invalid email or password.');
            }

            // Create the JWT payload and sign the token.
            const payload = { id: hostWithSecrets.id, displayName: hostWithSecrets.displayName };
            const token = fastify.jwt.sign({ payload });

            reply.setCookie('token', token, { //TODO check this token name
                path: '/', // The cookie is available to our entire site
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7
            });

            // IMPORTANT: Fetch the user again with the SAFE client to return to the frontend.
            // This ensures no secrets are ever sent in the response.
            const publicHost = await fastify.prisma.user.findUnique({
                where: { id: hostWithSecrets.id },
                select: publicUserSelect
            });

            return publicHost;

        } catch (error) {
            fastify.log.error(error, 'Login failed');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred during login.');
        }
    });

    // ROUTE: The route Google redirects back to after a user authorizes the app.
    fastify.get('/google/callback', {
      schema: {
        response: {
          201: { $ref: 'publicUser#' },
          409: { $ref: 'httpError#' },
          500: { $ref: 'httpError#' }
        },
      },
    }, async (request, reply) => {
      try {
        const { token } = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

        const googleResponse = await fetch(process.env.GOOGLE_OAUTH_USER_INFO_URL, {
          headers: {
            'Authorization': `Bearer ${token.access_token}`,
          },
        });

        const googleData = await googleResponse.json();

        let user = {
          displayName: googleData.name,
          email: googleData.email,
          googleId: googleData.id,
          avatarUrl: googleData.picture, //TODO dowload it from google URL and store it locally.
        };

        const existingUser = await fastify.prisma.user.findUnique({
          where: { email: user.email.toLowerCase() }
        });

        const generateUsername = (base = "user") => {
          const randomPart = Math.floor(100000 + Math.random() * 900000);
          return `${base}_${randomPart}`;
        };

        if (!existingUser) {
          user.displayName = (await fastify.prisma.user.findFirst({
            where: { displayName: user.displayName }
          })) ? generateUsername() : user.displayName;
        } else {
          user.displayName = existingUser.displayName;
        }

        const dbUser = await fastify.prisma.user.upsert({
          where: { email: user.email.toLowerCase() },
          update: { ...user },
          create: { ...user },
        });

        const payload  = { id: dbUser.id, displayName: dbUser.displayName };
        const jwt_signed_token = fastify.jwt.sign({ payload });

        reply.setCookie('token', jwt_signed_token, { //TODO check this token name
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7
        });

        reply.code(201);

        //redirect to logged area

        } catch (error) {
          fastify.log.error(error, 'Oauth Registration failed');
          if (error && error.statusCode) {
            return reply.send(error);
          }
          return reply.internalServerError('An unexpected error occurred during oauth registration.');
        }
    });


    // ROUTE: Generates a new secret and QR code for setting up 2FA.
    fastify.post('/2fa/generate', async (request, reply) => {
        // Generate 2FA secret and QR code logic
    });

    // ROUTE: Verifies a 2FA code and enables it for a user.
    fastify.post('/2fa/verify', async (request, reply) => {
        // Verify 2FA logic
    });

    // ROUTE: Disables 2FA for a user.
    fastify.post('/2fa/disable', async (request, reply) => {
        // Disable 2FA logic
    });

    // ROUTE: Checks if 2FA is enabled for a user.
    fastify.get('/2fa/enable', async (request, reply) => {
        // Enable 2FA check logic
    });
}
