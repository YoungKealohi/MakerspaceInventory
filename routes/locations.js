const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// show new location form
router.get("/new", (req, res) => {
    res.render("locations_form", { location: {}, formAction: '/locations/new', submitLabel: 'Create' })
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
    const [rows] = await pool.query('SELECT * FROM Location ORDER BY Name');
    res.render('locations', { locations: rows });
  } catch (err) {
    console.error('Error fetching locations', err);
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

// Deprecated: confirmation page removed — deletion uses inline JS confirm in the list view

// Delete location via POST (matches delete forms in views)
router.post('/delete/:LocationID', async (req, res) => {
  const { LocationID } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Set supplies' LocationID to NULL so they are not left referencing a deleted location
    await connection.query('UPDATE Supply SET LocationID = NULL WHERE LocationID = ?', [LocationID]);
    // Now delete the location
    await connection.query("DELETE FROM Location WHERE LocationID = ?", [LocationID]);
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
// Also accept POST to '/:LocationID/delete' (some views use that action)
router.post('/:LocationID/delete', async (req, res) => {
  const { LocationID } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('UPDATE Supply SET LocationID = NULL WHERE LocationID = ?', [LocationID]);
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