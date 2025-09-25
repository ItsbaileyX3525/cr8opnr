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
    database: process.env.DB_NAME,
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

async function getUserInfo(userId) {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            "SELECT gems, username, email FROM users WHERE id = ?",
            [userId]
        );
        if (!rows || rows.length === 0) {
            return null;
        }
        return rows[0];
    } catch (err) {
        console.log("Error:", err);
        throw err;
    } finally {
        if (conn) conn.release();
    }
}

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

app.get("/settings", async (req, res) => {
    try {
        const user = await getUserInfo(req.session.userId);
        if (!user) {
            res.sendFile(path.join(__dirname, "../dist/settings_nocred.html"), err => {
                if (err) console.log(err)
            })
            return
        }
        res.sendFile(path.join(__dirname, "../dist/settings_cred.html"), err => {
            if (err) console.log(err)
        })
    } catch (err) {
        console.log(err)
    }
})

app.get("/:page", (req, res, next) => {
    const filePath = path.join(__dirname, "../dist", req.params.page + ".html");
    res.sendFile(filePath, err => {
        if (err) {
            res.sendFile(path.join(__dirname, "../dist/404.html"), err => {
                if (err) next();
            });
        };
    });
});

app.get("/api/user/:id", requireLogin, requireOwner, async (req, res) => {
    try {
        const user = await getUserInfo(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.status(200).json({ success: true, user: user });
    } catch (err) {
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

app.get("/api/me", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: "Not logged in!" });
    }
    res.json({ success: true, userId: req.session.userId, role: req.session.role });
})

app.post("/api/changeusename", async (req, res) => {
    const { username, password } = req.body
    const userid = req.session.userId

    let conn
    try {
        conn = await pool.getConnection();

        const rows = await conn.query(
            "SELECT username, password FROM users WHERE id = ?",
            [userid]
        );

        if (!rows || rows.length === 0) {
            return res.status(200).json({ success: false, message: "Failed to retrieve your username" });
        }

        const storedHash = rows[0].password;
        const match = await bcrypt.compare(password, storedHash);

        if (!match) {
            res.status(200).json({ succses: false, message: "Incorrect Passowrd!" });
            return;
        }

        await conn.query(
            "UPDATE users SET username = ? WHERE id = ?",
            [username, userid]
        );

        res.status(200).json({ success: true, message: "Username changed successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
})

app.post("/api/changepassword", async (req, res) => {
    const { currPassword, newPassword } = req.body
    const userid = req.session.userId

    let conn
    try {
        conn = await pool.getConnection();

        const rows = await conn.query(
            "SELECT password FROM users WHERE id = ?",
            [userid]
        );

        if (!rows || rows.length === 0) {
            return res.status(200).json({ success: false, message: "Failed to retrieve your current password hash" });
        }

        const storedHash = rows[0].password;
        const match = await bcrypt.compare(currPassword, storedHash);

        if (!match) {
            return res.status(200).json({ succses: false, message: "Incorrect Passowrd!" });
        }

    bcrypt.genSalt(saltRounds, function(err, salt) {
        if (err) {
            console.log("Error generating salt:", err);
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
        bcrypt.hash(newPassword, salt, async function(err, hash) {
            if (err) {
                console.log("Error hashing password:", err);
                return res.status(500).json({ success: false, error: "Internal server error" });
            }

            await conn.query(
                "UPDATE users SET password = ? WHERE id = ?",
                [hash, userid]
            );

            return res.status(200).json({ success: true, message: "Password changed successfully!" });

        })
    })
    } catch (err) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
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
            return res.status(200).json({ success: false, message: "Invalid username or password" });
        }

        const storedHash = rows[0].password;
        const userId = rows[0].id;
        const match = await bcrypt.compare(password, storedHash);

        if (match) {
            req.session.userId = rows[0].id;
            return res.status(200).json({ success: true, userId: req.session.userId });
        } else {
            return res.status(200).json({ success: false, message: "Invalid username or password" });
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
        if (err) {
            console.log("Error generating salt:", err);
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
        bcrypt.hash(password, salt, async function(err, hash) {
            if (err) {
                console.log("Error hashing password:", err);
                return res.status(500).json({ success: false, error: "Internal server error" });
            }
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

                const idResult = await conn.query("SELECT LAST_INSERT_ID() as id");
                const userId = Number(idResult[0].id);
                req.session.userId = userId;

                res.status(200).send({ success: true, userId: userId });
            } catch (err) {
                console.log("Error:", err);
                res.status(500).json({ success: false, error: "Internal server error" });
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

app.get("/api/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false, message: "Error logging out" });
        res.clearCookie('connect.sid');
        res.redirect("/");
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Internal server error, some shit, message @Bailey on slack");
});

app.listen(PORT, () => {
    console.log("Listening on port 3000 ig");
});