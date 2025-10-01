import xss from 'xss';
import bcrypt from 'bcrypt';

export default async function (fastify, opts) {
    // Ensure the sessionManager plugin is registered.
    if (!fastify.hasDecorator('session')) {
        throw new Error('sessionManager plugin must be registered before session routes');
    }

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
                required: ['displayName', 'email', 'password'],
                additionalProperties: false
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        user: { $ref: 'publicUser#' }
                    },
                    required: ['user']
                },
                409: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const displayName = xss(request.body.displayName);
            const { email, password } = request.body;

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

            const passwordHash = await bcrypt.hash(password, 10);

            const newUser = await fastify.prisma.user.create({
                data: {
                    displayName,
                    email: email.toLowerCase(),
                    passwordHash
                }
            });

            reply.code(201);
            return { user: newUser };

        } catch (error) {
            fastify.log.error(error, 'Registration failed');
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred during registration.');
        }
    });

    //------ Session authentication required for all routes below this line ------

    // ROUTE: Searches for users by display name
    fastify.get('/search', {
        preHandler: [fastify.session.authorize],
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    search: { type: 'string', minLength: 1, maxLength: 50 }
                },
                required: ['search']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        users: {
                            type: 'array',
                            items: { $ref: 'publicUser#' }
                        }
                    },
                    required: ['users']
                },
                400: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { search } = request.query;

            const users = await fastify.prisma.user.findMany({
                where: {
                    displayName: {
                        contains: search
                    }
                },
                take: 10 // Limit to 10 results
            });

            return { users: users };

        } catch (error) {
            fastify.log.error(error, `Error searching users with query: ${request.query.search}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while searching users.');
        }
    });

    // ROUTE: Gets the public profile (stats, display name) of any user by their ID.
    fastify.get('/:userId', {
        preHandler: [fastify.session.authorize],
        schema: {
            params: {
                type: 'object',
                properties: {
                    userId: { type: 'integer' }
                },
                required: ['userId']
            }
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    user: { $ref: 'publicUser#' }
                },
                required: ['user']
            },
            404: { $ref: 'httpError#' },
            500: { $ref: 'httpError#' }
        }
    }, async (request, reply) => {
        try {
            const userId = request.params.userId;

            const user = await fastify.prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw fastify.httpErrors.notFound(`User ${userId} not found`);
            }

            return { user: user };

        } catch (error) {
            fastify.log.error(error, `Error fetching user profile for ID ${request.params.userId}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while fetching the user profile.');
        }
    });

    // ROUTE: Gets the match history for a specific user.
    fastify.get('/:userId/history', {
        preHandler: [fastify.session.authorize],
        schema: {
            params: {
                type: 'object',
                properties: {
                    userId: { type: 'integer' }
                },
                required: ['userId']
            }
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    matches: {
                        type: 'array',
                        items: { $ref: 'matchDetail#' }
                    }
                },
                required: ['matches']
            },
            500: { $ref: 'httpError#' }
        }
    }, async (request, reply) => {
        try {
            const userId = request.params.userId;

            const matches = await fastify.prisma.match.findMany({
                where: {
                    OR: [
                        { playerOneId: userId },
                        { playerTwoId: userId }
                    ]
                },

                orderBy: {
                    playedAt: 'desc'
                }
            });

            return { matches: matches };

        } catch (error) {
            fastify.log.error(error, `Error fetching match history for user ID ${request.params.userId}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while fetching match history.');
        }
    });

    //------ User authentication required for all routes below this line ------

    // ROUTE: Generates a new secret and QR code for setting up TOTP.
    fastify.post('/:userId/totp/setup', {
        preHandler: [fastify.session.authorizeParticipant],
        schema: {
            params: {
                type: 'object',
                properties: { userId: { type: 'integer' } },
                required: ['userId']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        qrCodeUrl: { type: 'string' }
                    },
                    required: ['qrCodeUrl']
                },
                401: { $ref: 'httpError#' },
                403: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const { userId } = request.params;

            const user = await fastify.prisma.user.findUnique({
                where: { id: userId },
                select: { email: true }
            });

            if (!user) {
                throw fastify.httpErrors.notFound('User not found.');
            }

            const totpInstance = fastify.totp.setup(user.email);
            const secret = totpInstance.secret.base32;

            await fastify.prisma.user.update({
                where: { id: userId },
                data: { totpSecret: secret, isTwoFaEnabled: false },
            });

            const qrCodeDataURL = await fastify.totp.generateQRCode(totpInstance);
            return { qrCodeUrl: qrCodeDataURL };

        } catch (error) {
            fastify.log.error(error, `Error setting up TOTP for user ID ${request.params.userId}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred during TOTP setup.');
        }
    });

    // ROUTE: Verifies a TOTP code and enables it for a user.
    fastify.post('/:userId/totp/verify', {
        preHandler: [fastify.session.authorizeParticipant],
        schema: {
            params: {
                type: 'object',
                properties: { userId: { type: 'integer' } },
                required: ['userId']
            },
            body: {
                type: 'object',
                properties: { token: { type: 'string' } },
                required: ['token'],
                additionalProperties: false
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        user: { $ref: 'publicUser#' }
                    },
                    required: ['user']
                },
                400: { $ref: 'httpError#' },
                401: { $ref: 'httpError#' },
                403: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const userId = request.params.userId;
            const { token } = request.body;

            const user = await fastify.prisma.user.findUnique({
                where: { id: userId },
                omit: { totpSecret: false }
            });

            if (!user || !user.totpSecret) {
                throw fastify.httpErrors.badRequest('TOTP is not set up for this user.');
            }

            const isValid = fastify.totp.verify(token, user.totpSecret);

            if (!isValid) {
                throw fastify.httpErrors.badRequest('Invalid TOTP token.');
            }

            const updatedUser = await fastify.prisma.user.update({
                where: { id: userId },
                data: { isTwoFaEnabled: true },
            });

            return { user: updatedUser };

        } catch (error) {
            fastify.log.error(error, `Error verifying TOTP for user ID ${request.params.userId}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred during TOTP verification.');
        }
    });

    // ROUTE: Disables TOTP for a user.
    fastify.post('/:userId/totp/disable', {
        preHandler: [fastify.session.authorizeParticipant],
        schema: {
            params: {
                type: 'object',
                properties: { userId: { type: 'integer' } },
                required: ['userId']
            },
            body: {
                type: 'object',
                properties: { password: { type: 'string' } },
                required: ['password'],
                additionalProperties: false
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        user: { $ref: 'publicUser#' }
                    },
                    required: ['user']
                },
                401: { $ref: 'httpError#' },
                403: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const userId = request.params.userId;
            const { password } = request.body;

            const user = await fastify.prisma.user.findUnique({
                where: { id: userId },
                omit: { passwordHash: false }
            });

            if (!user || !user.passwordHash) {
                throw fastify.httpErrors.unauthorized('Invalid user or password configuration.');
            }

            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                throw fastify.httpErrors.unauthorized('Invalid password.');
            }

            const updatedUser = await fastify.prisma.user.update({
                where: { id: userId },
                data: { isTwoFaEnabled: false, totpSecret: null },
            });

            return { user: updatedUser };

        } catch (error) {
            fastify.log.error(error, `Error disabling TOTP for user ID ${request.params.userId}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while disabling TOTP.');
        }
    });

    // ROUTE: Updates user profile information
    fastify.patch('/:userId', {
        preHandler: [fastify.session.authorizeParticipant],
        schema: {
            params: {
                type: 'object',
                properties: {
                    userId: { type: 'integer' }
                },
                required: ['userId']
            },
            body: {
                type: 'object',
                properties: {
                    displayName: { type: 'string', minLength: 3, maxLength: 20 },
                    avatarUrl: { type: 'string', maxLength: 500 }
                },
                additionalProperties: false
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        user: { $ref: 'publicUser#' }
                    },
                    required: ['user']
                },
                400: { $ref: 'httpError#' },
                403: { $ref: 'httpError#' },
                404: { $ref: 'httpError#' },
                409: { $ref: 'httpError#' },
                500: { $ref: 'httpError#' }
            }
        }
    }, async (request, reply) => {
        try {
            const userId = request.params.userId;
            const displayName = request.body.displayName ? xss(request.body.displayName) : undefined;
            const avatarUrl = request.body.avatarUrl ? xss(request.body.avatarUrl) : undefined;

            if (!displayName && !avatarUrl) {
                throw fastify.httpErrors.badRequest('No update data provided.');
            }

            if (displayName) {
                const nameExists = await fastify.prisma.user.findFirst({
                    where: {
                        displayName: displayName,
                        id: { not: userId }
                    }
                });

                if (nameExists) {
                    throw fastify.httpErrors.conflict('Display name is already in use');
                }
            }

            const updatedUser = await fastify.prisma.user.update({
                where: { id: userId },
                data: {
                    ...(displayName && { displayName: displayName }),
                    ...(avatarUrl && { avatarUrl: avatarUrl })
                }
            });

            return { user: updatedUser };

        } catch (error) {
            fastify.log.error(error, `Error updating user profile for ID ${request.params.userId}`);
            if (error && error.statusCode) {
                return reply.send(error);
            }
            return reply.internalServerError('An unexpected error occurred while updating the user profile.');
        }
    });
}
