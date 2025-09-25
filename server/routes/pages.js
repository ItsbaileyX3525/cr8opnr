const express = require('express');
const path = require('path');
const { DIST_DIR } = require('../config/paths');
const { getUserProfileById } = require('../services/userService');

const router = express.Router();

router.get(["/mines", "/mines.html"], (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(DIST_DIR, 'mines.html'), (err) => {
        if (err) {
            next(err);
        }
    });
});

router.get('/settings', async (req, res) => {
    try {
        const user = await getUserProfileById(req.session.userId);
        const page = user ? 'settings_cred.html' : 'settings_nocred.html';
        res.sendFile(path.join(DIST_DIR, page), (err) => {
            if (err) console.error(err);
        });
    } catch (err) {
        console.error(err);
        res.sendFile(path.join(DIST_DIR, 'settings_nocred.html'), (sendErr) => {
            if (sendErr) console.error(sendErr);
        });
    }
});

router.get('/:page', (req, res, next) => {
    const filePath = path.join(DIST_DIR, `${req.params.page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.sendFile(path.join(DIST_DIR, '404.html'), (fallbackErr) => {
                if (fallbackErr) next();
            });
        }
    });
});

module.exports = router;
