const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require("cors");
const { ROOT_DIR, DIST_DIR } = require('./config/paths');
require('dotenv').config({ path: path.join(ROOT_DIR, '.env') });

const sessionConfig = require('./config/session');
const { PORT } = require('./config/constants');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const pagesRoutes = require('./routes/pages');
const minesRoutes = require("./routes/mines");
const crashRoutes = require("./routes/crash");

const app = express();

app.use(session(sessionConfig));
app.use(express.json());
app.use(express.static(DIST_DIR));
app.use(cors())

app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', minesRoutes);
app.use('/api', crashRoutes);
app.use('/', pagesRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Internal server error, some shit, message @Bailey on slack');
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT} ig`);
});