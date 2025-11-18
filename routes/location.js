const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// show new location form
router.get("/new", (req, res) => {
    res.render("new_location", { title: "New Location" })
});

// insert new location
router.post("/new", async (req, res) => {
    const { name, description } = req.body;

    await pool.query(
        "INSERT INTO Location (Name, Description) VALUES (?, ?)",
        [name, description]
    );
    res.redirect("/locations");
});

// list the locations
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Location ORDER BY Name');
    res.render('locations', { locations: rows });
  } catch (err) {
    console.error('Error fetching machines', err);
    res.status(500).send('Database error');
  }
});

module.exports = router;