const express = require('express');
const bcrypt = require('bcrypt');
const { SALT_ROUNDS } = require('../config/constants');
const { requireLogin } = require('../middleware/auth');
const {
    getUserAuthByUsername,
    createUser,
    isUsernameTaken,
    isEmailTaken,
} = require('../services/userService');

const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await getUserAuthByUsername(username);
        if (!user) {
            return res.status(200).json({ success: false, message: 'Invalid username or password' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(200).json({ success: false, message: 'Invalid username or password' });
        }

        req.session.userId = user.id;
        res.status(200).json({ success: true, userId: req.session.userId });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const [usernameTaken, emailTaken] = await Promise.all([
            isUsernameTaken(username),
            isEmailTaken(email),
        ]);

        if (usernameTaken) {
            return res.status(200).send({ success: false, message: 'username already in use', error_code: 42069 });
        }

        if (emailTaken) {
            return res.status(200).send({ success: false, message: 'email already in use', error_code: 69420 });
        }

        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const userId = await createUser(username, email, hash);
        req.session.userId = userId;

        res.status(200).send({ success: true, userId });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Not logged in!' });
    }
    res.json({ success: true, userId: req.session.userId, role: req.session.role });
});

router.get('/profile', requireLogin, (req, res) => {
    res.status(200).json({ success: true, userId: req.session.userId });
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error logging out' });
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

module.exports = router;
