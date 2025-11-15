const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.get('/', (req, res) => {
    res.render('index', { title: "Makerspace Inventory" });
});

module.exports = router;
