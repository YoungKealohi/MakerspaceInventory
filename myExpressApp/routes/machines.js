// routes/machines.js
import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

/**
 * List all machines
 * GET /machines
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Machine ORDER BY MachineID DESC');
    res.render('machines', { machines: rows });
  } catch (err) {
    console.error('Error fetching machines', err);
    res.status(500).send('Database error');
  }
});

/**
 * New machine form
 * GET /machines/new
 */
router.get('/new', (req, res) => {
  // Render form with empty machine object (used by the form template)
  res.render('machines_form', { machine: {}, formAction: '/machines/new', submitLabel: 'Create' });
});

/**
 * Create machine
 * POST /machines/new
 */
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
  }
});

/**
 * Edit machine form
 * GET /machines/:MachineID/edit
 */
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

/**
 * Update machine
 * POST /machines/:MachineID/edit
 */
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

/**
 * Delete machine
 * POST /machines/:MachineID/delete
 */
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

export default router;
