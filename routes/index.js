const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.get('/', (req, res) => {
    console.log("INDEX ROUTE HIT");
    res.render('index', { title: "Welcome", page: "index" });
});

module.exports = router;
