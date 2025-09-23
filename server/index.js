const express = require('express')
const fs = require('fs')
const path = require('path')

const app = express();
const PORT = 3000;

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

    console.log("Recieved username:", username)

    res.status(200).send({ success: true })
})

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Internal server error, some shit, message @Bailey on slack")
})

app.listen(PORT, () => {
    console.log("Listening on port 3000 ig")
})