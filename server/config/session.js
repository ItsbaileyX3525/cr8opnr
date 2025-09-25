const crypto = require('crypto');
const path = require('path');
const { ROOT_DIR } = require('./paths');
require('dotenv').config({ path: path.join(ROOT_DIR, '.env') });

const fromEnv = (process.env.SESSION_SECRET || '').trim();
let secret = fromEnv;

if (!secret) {
    if (process.env.NODE_ENV === 'production') {
        // Fail fast in production if secret is missing
        throw new Error('SESSION_SECRET is required in production. Set it in the environment.');
    } else {
        // Development fallback to avoid express-session deprecation warning
        secret = crypto.randomBytes(32).toString('hex');
        console.warn('[session] SESSION_SECRET not set; using a temporary secret for development.');
    }
}

module.exports = {
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60, // 1 hour
    },
};
