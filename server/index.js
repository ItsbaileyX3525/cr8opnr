const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mariadb = require('mariadb');
require('dotenv').config();

const app = express();
const PORT = 3000;

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: 5,
    database: "cr8opnrUsers"
});
const saltRounds = 10;

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60
    }
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, "../dist")));

app.get("/:page", (req, res, next) => {
    const filePath = path.join(__dirname, "../dist", req.params.page + ".html");
    res.sendFile(filePath, err => {
        if (err) next();
    });
});

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: "Not logged in" });
    }
    next();
}

function requireOwner(req, res, next) {
    const requestedId = parseInt(req.params.id, 10);
    if (req.session.userId !== requestedId) {
        return res.status(403).json({ success: false, message: "Forbidden" });
    }
    next();
}

app.get("/api/user/:id", requireLogin, requireOwner, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            "SELECT gems FROM users WHERE id = ?",
            [req.params.id]
        );
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.status(200).json({ success: true, user: rows[0] });
    } catch (err) {
        console.log("Error:", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.get("/api/me", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: "Not logged in!" });
    }
    res.json({ success: true, userId: req.session.userId, role: req.session.role });
})

app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();

        const rows = await conn.query(
            "SELECT username, password, id FROM users WHERE username = ?",
            [username]
        );

        if (!rows || rows.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid username or password" });
        }

        const storedHash = rows[0].password;
        const userId = rows[0].id;
        const match = await bcrypt.compare(password, storedHash);

        if (match) {
            req.session.userId = rows[0].id;
            return res.status(200).json({ success: true, userId: req.session.userId });
        } else {
            return res.status(401).json({ success: false, message: "Invalid username or password" });
        }
    } catch (err) {
        console.log("Error:", err);
        return res.status(500).json({ success: false, error: "Internal server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/signup", (req, res) => {
    const { username, email, password } = req.body;

    bcrypt.genSalt(saltRounds, function(err, salt) {
        bcrypt.hash(password, salt, async function(err, hash) {
            let conn;
            try {
                conn = await pool.getConnection();

                const userCheck = await conn.query(
                    "SELECT username FROM users WHERE username = ?",
                    [username]
                );

                if (userCheck.length > 0) {
                    res.status(200).send({ success: false, message: 'username already in use', error_code: 42069 });
                    return;
                }

                const emailCheck = await conn.query(
                    "SELECT email FROM users WHERE email = ?",
                    [email]
                );

                if (emailCheck.length > 0) {
                    res.status(200).send({ success: false, message: 'email already in use', error_code: 69420 });
                    return;
                }

                await conn.query(
                    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
                    [username, email, hash]
                );

                res.status(200).send({ success: true });
            } catch (err) {
                console.log("Error:", err);
                res.status(200).send({ success: false });
                return;
            } finally {
                if (conn) conn.release();
            }
        });
    });
});

app.get("/api/profile", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: "Not logged in" });
    }
    res.status(200).json({ success: true, userId: req.session.userId });
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false, message: "Error logging out" });
        res.clearCookie('connect.sid');
        res.status(200).json({ success: true });
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Internal server error, some shit, message @Bailey on slack");
});

app.listen(PORT, () => {
    console.log("Listening on port 3000 ig");
});