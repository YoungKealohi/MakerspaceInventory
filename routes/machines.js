const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// list the machines
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Machine ORDER BY MachineID DESC');
    // Check if user is admin (session-based)
    const isAdmin = req.session && req.session.username === 'admin';
    res.render('machines', { machines: rows, isAdmin });
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

// edit machine form
router.get('/:MachineID/edit', async (req, res) => {
  const { MachineID } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM Machine WHERE MachineID = ?', [MachineID]);
    if (rows.length === 0) return res.status(404).send('Machine not found');

    const machine = rows[0];
    // convert numeric 1/0 to boolean-ish for form rendering
    machine.WorkingStatus = machine.WorkingStatus ? 1 : 0;

    res.render('machines_form', {
      machine,
      formAction: `/machines/${MachineID}/edit`,
      submitLabel: 'Save Changes'
    });
  } catch (err) {
    console.error('Error loading machine', err);
    res.status(500).send('Database error');
  }
});

// update machine form
router.post('/:MachineID/edit', async (req, res) => {
  const { MachineID } = req.params;
  try {
    const { MachineName, SerialNumber, Model } = req.body;
    const WorkingStatus = req.body.WorkingStatus ? 1 : 0;

    await pool.query(
      `UPDATE Machine SET MachineName = ?, WorkingStatus = ?, SerialNumber = ?, Model = ? WHERE MachineID = ?`,
      [MachineName, WorkingStatus, SerialNumber || null, Model || null, MachineID]
    );

    res.redirect('/machines');
  } catch (err) {
    console.error('Error updating machine', err);
    res.status(500).send('Error updating machine');
  }
});

//delete machine form
router.post('/:MachineID/delete', async (req, res) => {
  const { MachineID } = req.params;
  try {
    await pool.query('DELETE FROM Machine WHERE MachineID = ?', [MachineID]);
    res.redirect('/machines');
  } catch (err) {
    console.error('Error deleting machine', err);
    res.status(500).send('Error deleting machine');
  }
});


module.exports = router;