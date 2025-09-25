const pool = require('../config/db');

async function withConnection(callback) {
    let conn;
    try {
        conn = await pool.getConnection();
        return await callback(conn);
    } finally {
        if (conn) conn.release();
    }
}

async function getUserProfileById(userId) {
    return withConnection(async (conn) => {
        const rows = await conn.query(
            'SELECT gems, username, email FROM users WHERE id = ? LIMIT 1',
            [userId]
        );
        return rows && rows.length > 0 ? rows[0] : null;
    });
}

async function getUserAuthById(userId) {
    return withConnection(async (conn) => {
        const rows = await conn.query(
            'SELECT id, username, password FROM users WHERE id = ? LIMIT 1',
            [userId]
        );
        return rows && rows.length > 0 ? rows[0] : null;
    });
}

async function getUserAuthByUsername(username) {
    return withConnection(async (conn) => {
        const rows = await conn.query(
            'SELECT id, username, password FROM users WHERE username = ? LIMIT 1',
            [username]
        );
        return rows && rows.length > 0 ? rows[0] : null;
    });
}

async function updateUsername(userId, username) {
    return withConnection(async (conn) => {
        await conn.query(
            'UPDATE users SET username = ? WHERE id = ?',
            [username, userId]
        );
    });
}

async function updatePasswordHash(userId, passwordHash) {
    return withConnection(async (conn) => {
        await conn.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [passwordHash, userId]
        );
    });
}

async function isUsernameTaken(username) {
    return withConnection(async (conn) => {
        const rows = await conn.query(
            'SELECT username FROM users WHERE username = ? LIMIT 1',
            [username]
        );
        return rows && rows.length > 0;
    });
}

async function isEmailTaken(email) {
    return withConnection(async (conn) => {
        const rows = await conn.query(
            'SELECT email FROM users WHERE email = ? LIMIT 1',
            [email]
        );
        return rows && rows.length > 0;
    });
}

async function createUser(username, email, passwordHash) {
    return withConnection(async (conn) => {
        const result = await conn.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, passwordHash]
        );

        if (result && typeof result.insertId !== 'undefined') {
            return Number(result.insertId);
        }

        const idResult = await conn.query('SELECT LAST_INSERT_ID() as id');
        return Number(idResult[0].id);
    });
}

module.exports = {
    getUserProfileById,
    getUserAuthById,
    getUserAuthByUsername,
    updateUsername,
    updatePasswordHash,
    isUsernameTaken,
    isEmailTaken,
    createUser,
};
