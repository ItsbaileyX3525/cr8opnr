const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mariadb = require('mariadb');
require('dotenv').config();

const app = express();
const PORT = 3000;

const pool = mariadb.createPool({host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, connectionLimit: 5});
const saltRounds = 10;

app.use(express.static(path.join(__dirname, "../dist")));
app.use(express.json())

app.get("/:page", (req, res, next) => {
    const filePath = path.join(__dirname, "../dist", req.params.page + ".html")
    res.sendFile(filePath, err => {
        if (err) next() //Actually never heard of the next function
    })
})

app.post("/api/signup", (req, res) => {
    const { username, email, password } = req.body

    //Start with hashing the password and add rest of the data to database
    bcrypt.genSalt(saltRounds, function (err, salt) {
        bcrypt.hash(password, salt, async function(err, hash) {
            try {
                conn = await pool.getConnection();
                //Kinda dont know sql
                const rows = await conn.query("")
            } finally {
                if (conn) conn.release();
            }
        })
    })

    res.status(200).send({ success: true })
})

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Internal server error, some shit, message @Bailey on slack")
})

app.listen(PORT, () => {
    console.log("Listening on port 3000 ig")
})