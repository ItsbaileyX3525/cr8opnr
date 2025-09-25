const path = require('path');

const SERVER_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(SERVER_DIR, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');

module.exports = {
    SERVER_DIR,
    ROOT_DIR,
    DIST_DIR,
};
