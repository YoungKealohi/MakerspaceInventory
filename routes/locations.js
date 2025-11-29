const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// show new location form
router.get("/new", (req, res) => {
    res.render("locations_form", { 
        location: {}, 
        formAction: '/locations/new', 
        submitLabel: 'Create',
        isAdmin: req.session?.isAdmin || false
    });
});

// insert new location
router.post("/new", async (req, res) => {
  // form uses `Name` and `Description` fields
  const { Name, Description } = req.body;
  try {
    await pool.query(
      "INSERT INTO Location (Name, Description) VALUES (?, ?)",
      [Name || null, Description || null]
    );
    res.redirect("/locations");
  } catch (err) {
    console.error('Error creating location', err);
    res.status(500).send('Database error');
  }
});



// list the locations
router.get('/', async (req, res) => {
  try {
    // include LocationID so templates can build edit/delete links
    const [rows] = await pool.query('SELECT LocationID, Name, Description FROM Location ORDER BY Name');
    res.render('locations', { 
        locations: rows,
        isAdmin: req.session?.isAdmin || false
    });
  } catch (err) {
    console.error('Error fetching locations', err);
    res.status(500).send('Database error');
  }
});

// edit location form
router.get('/:LocationID/edit', async (req, res) => {
  const { LocationID } = req.params;

  try {
    // include LocationID in the returned row so the form can show the id
    const [rows] = await pool.query("SELECT LocationID, Name, Description FROM Location WHERE LocationID = ?", [LocationID]);

    if (rows.length === 0) {
      return res.status(404).send("Location not found");
    }
    const location = rows[0];

    res.render('locations_form', { 
      location,
      formAction: `/locations/${LocationID}/edit`,
      submitLabel: 'Save Changes',
      isAdmin: req.session?.isAdmin || false
    });
  } catch (err) {
    console.error("Error fetching location:", err);
    res.status(500).send("Database error");
  }
});

// handle edit submission
router.post('/:LocationID/edit', async (req, res) => {
  const { LocationID } = req.params;
  const { Name, Description } = req.body;
  try {
    await pool.query(
      'UPDATE Location SET Name = ?, Description = ? WHERE LocationID = ?',
      [Name || null, Description || null, LocationID]
    );
    res.redirect('/locations');
  } catch (err) {
    console.error('Error updating location', err);
    res.status(500).send('Database error');
  }
});

// delete location
router.post('/:LocationID/delete', async (req, res) => {
  const { LocationID } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM SupplyLocation WHERE LocationID = ?', [LocationID]);
    await connection.query('DELETE FROM Location WHERE LocationID = ?', [LocationID]);
    await connection.commit();
    res.redirect('/locations');
  } catch (err) {
    await connection.rollback();
    console.error('Error deleting location', err);
    res.status(500).send('Database error');
  } finally {
    connection.release();
  }
});




module.exports = router;