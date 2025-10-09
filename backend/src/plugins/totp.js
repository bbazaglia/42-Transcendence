import fp from 'fastify-plugin';
import { TOTP, Secret } from 'otpauth';
import qrcode from 'qrcode';

async function totpPlugin(fastify, opts) {
    const TOTP_ALG = opts.algorithm || TOTP.defaults.algorithm;
    const TOTP_DIGITS = opts.digits || TOTP.defaults.digits;
    const TOTP_ISSUER = opts.issuer || TOTP.defaults.issuer
    const TOTP_ISSUER_IN_LABEL = opts.issuerInLabel || TOTP.defaults.issuerInLabel;
    const TOTP_PERIOD = opts.period || TOTP.defaults.period;
    const TOTP_WINDOW = opts.window || 1; // Allow 1 step before/after for clock skew

    // Generates a new TOTP instance with a new secret.
    function setupNewTotp(userLabel) {
        
        return new TOTP({
            algorithm: TOTP_ALG,
            digits: TOTP_DIGITS,
            issuer: TOTP_ISSUER,
            label: userLabel,
            issuerInLabel: TOTP_ISSUER_IN_LABEL,
            period: TOTP_PERIOD,
            secret: new Secret()
        });
    }

    async function generateQRCode(totpInstance) {
        try {
            const url = totpInstance.toString();
            fastify.log.info(`Generating QR code for TOTP URL: ${url}`);
            return await qrcode.toDataURL(url);
        } catch (error) {
            fastify.log.error(error, 'Error generating QR code:');
            throw new Error(`QR code generation failed: ${error.message}`);
        }
    }

    function verifyTotp(token, secret) {
        if (!token || !secret) {
            fastify.log.warn('verifyTotp called without a token or secret.');
            return false;
        }
        try {
            // Create a temporary instance for validation.
            const totp = new TOTP({
                issuer: TOTP_ISSUER,
                algorithm: TOTP_ALG,
                digits: TOTP_DIGITS,
                period: TOTP_PERIOD,
                secret: Secret.fromBase32(secret),
            });

            const delta = totp.validate({ token, window: TOTP_WINDOW });
            fastify.log.info(`TOTP verification result for token ${token}: ${delta !== null}`);
            return delta !== null;
        } catch (error) {
            fastify.log.error(error, 'TOTP verification failed due to an unexpected error.');
            throw new Error('An internal error occurred during TOTP verification.');
        }
    }

    const totp = {
        setup: setupNewTotp,
        generateQRCode: generateQRCode,
        verify: verifyTotp,
    };

    fastify.decorate('totp', totp);
}

export default fp(totpPlugin);
