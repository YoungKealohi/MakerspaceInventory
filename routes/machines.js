const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// list the machines
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Machine ORDER BY MachineID DESC');
    res.render('machines', { machines: rows });
  } catch (err) {
    console.error('Error fetching machines', err);
    res.status(500).send('Database error');
  }
});

// blank new machine form
router.get('/new', (req, res) => {
  // Render form with empty machine object (used by the form template)
  res.render('machines_form', { machine: {}, formAction: '/machines/new', submitLabel: 'Create' });
});

// create new machine
router.post('/new', async (req, res) => {
  try {
    const { MachineName, SerialNumber, Model } = req.body;
    // Checkbox will be present if checked. Convert to 1/0
    const WorkingStatus = req.body.WorkingStatus ? 1 : 0;

    await pool.query(
      'INSERT INTO Machine (MachineName, WorkingStatus, SerialNumber, Model) VALUES (?, ?, ?, ?)',
      [MachineName, WorkingStatus, SerialNumber || null, Model || null]
    );

    res.redirect('/machines');
  } catch (err) {
    console.error('Error creating machine', err);
    // Simple error handling — you can improve by rendering the form again with an error message
    res.status(500).send('Error creating machine. Maybe SerialNumber duplicate?');
    res.render('machines_form', { machine: {}, formAction: '/machines/new', submitLabel: 'Create' });
  }
});


module.exports = router;