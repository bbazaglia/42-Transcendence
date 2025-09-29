import fp from 'fastify-plugin'
import fastifyOauth2 from '@fastify/oauth2'

async function oauthPlugin(fastify, opts) {
  fastify.register(fastifyOauth2, {
    name: 'googleOAuth2',
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID,
        secret: process.env.GOOGLE_CLIENT_SECRET,
      },
      auth: fastifyOauth2.GOOGLE_CONFIGURATION
    },
    startRedirectPath: process.env.GOOGLE_OAUTH_START_REDIRECT_PATH,
    callbackUri: process.env.GOOGLE_CALLBACK_URL,
    scope: ['openid', 'profile', 'email'],
  });
};

export default fp(oauthPlugin);