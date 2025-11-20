const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// show new location form
router.get("/new", (req, res) => {
    res.render("locations_form", { location: {}, formAction: '/locations/new', submitLabel: 'Create' })
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
    res.render('locations', { locations: rows,
      
     });
  } catch (err) {
    console.error('Error fetching machines', err);
    res.status(500).send('Database error');
  }
});

// edit location form
router.get('/:LocationID/edit', async (req, res) => {
  const { LocationID } = req.params;

  try {
    const [rows] = await pool.query("SELECT * FROM Location WHERE LocationID = ?", [LocationID]);

    if (rows.length === 0) {
      return res.status(404).send("Location not found");
    }
    const location = rows[0];

    res.render('locations_form', { 
      location,
      formAction: `/locations/${LocationID}/edit`,
      submitLabel: 'Save Changes' });
  } catch (err) {
    console.error("Error fetching location:", err);
    res.status(500).send("Database error");
  }
});

// Update location
router.post('/:LocationID/edit', async (req, res) => {
  const { LocationID } = req.params;
  try {
    const { Name, Description } = req.body;
    await pool.query(
      "UPDATE Location SET Name = ?, Description = ? WHERE LocationID = ?",
      [Name, Description || null, LocationID]
    );

    res.redirect("/locations");
  } catch (err) {
    console.error("Error updating location:", err);
    res.status(500).send("Database error");
  }
});

// Delete location
router.get('/:LocationID/delete', async (req, res) => {
  const { LocationID } = req.params;

  try {
    // If you later add foreign keys (e.g., supplies at a location), 
    // you may want to check for dependencies before deleting.
    await pool.query("DELETE FROM Location WHERE LocationID = ?", [LocationID]);
    res.redirect("/locations");
  } catch (err) {
    console.error("Error deleting location:", err);
    res.status(500).send("Database error");
  }
});



module.exports = router;