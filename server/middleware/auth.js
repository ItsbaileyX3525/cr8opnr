function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }
    next();
}

function requireOwner(req, res, next) {
    const requestedId = parseInt(req.params.id, 10);
    if (!Number.isFinite(requestedId) || req.session.userId !== requestedId) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
}

module.exports = {
    requireLogin,
    requireOwner,
};
