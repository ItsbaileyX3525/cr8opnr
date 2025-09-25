const express = require('express');
const bcrypt = require('bcrypt');
const { SALT_ROUNDS } = require('../config/constants');
const { requireLogin, requireOwner } = require('../middleware/auth');
const {
    getUserProfileById,
    getUserAuthById,
    updateUsername,
    updatePasswordHash,
} = require('../services/userService');

const router = express.Router();

router.get('/user/:id', requireLogin, requireOwner, async (req, res) => {
    try {
        const user = await getUserProfileById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/changeusename', requireLogin, async (req, res) => {
    const { username, password } = req.body;
    const userId = req.session.userId;

    try {
        const user = await getUserAuthById(userId);
        if (!user) {
            return res.status(200).json({ success: false, message: 'Failed to retrieve your username' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(200).json({ succses: false, message: 'Incorrect Passowrd!' });
        }

        await updateUsername(userId, username);
        res.status(200).json({ success: true, message: 'Username changed successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/changepassword', requireLogin, async (req, res) => {
    const { currPassword, newPassword } = req.body;
    const userId = req.session.userId;

    try {
        const user = await getUserAuthById(userId);
        if (!user) {
            return res.status(200).json({ success: false, message: 'Failed to retrieve your current password hash' });
        }

        const match = await bcrypt.compare(currPassword, user.password);
        if (!match) {
            return res.status(200).json({ succses: false, message: 'Incorrect Passowrd!' });
        }

        const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await updatePasswordHash(userId, hash);
        res.status(200).json({ success: true, message: 'Password changed successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
