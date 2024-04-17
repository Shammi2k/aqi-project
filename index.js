import express from "express";
import axios from "axios";

const app = express();
const port = 3000;

// Use the static middleware to access data in the public folder
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});