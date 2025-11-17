const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// list the supplies
router.get('/machines/:MachineID/supplies', async (req, res) => {
  const { MachineID } = req.params;
  try {
    const [machineRows] = await pool.query('SELECT * FROM Machine WHERE MachineID = ?', [MachineID]);
    const [supplyRows] = await pool.query(
        `SELECT s.SupplyID, s.Name AS SupplyName, s.Color, s.Brand,
            l.Name AS LocationName, cs.Count, cs.CriticalLevel, ss.Status,
            CASE
                WHEN cs.SupplyID IS NOT NULL THEN 'Countable'
                WHEN ss.SupplyID IS NOT NULL THEN 'Status'
            END AS SupplyType    
        FROM Supply s
        LEFT JOIN CountableSupply cs ON s.SupplyID = cs.SupplyID
        LEFT JOIN StatusSupply ss ON s.SupplyID = ss.SupplyID
        LEFT JOIN Location l ON s.LocationID = l.LocationID
        WHERE s.MachineID = ? 
        ORDER BY s.SupplyID ASC`, [MachineID]);

    if (machineRows.length == 0) return res.status(404).send('Machine not found');
    res.render('supply', { 
        machine: machineRows[0],
        supplies: supplyRows
    });
  } catch (err) {
    console.error('Error fetching machines', err);
    res.status(500).send('Database error');
  }
});

// blank new supply form
router.get('/machines/:MachineID/supplies/new', async (req, res) => {
    const { MachineID } = req.params;
    try {
        const [machineRows] = await pool.query('SELECT * FROM Machine WHERE MachineID = ?', [MachineID]);
        const [locations] = await pool.query('SELECT * FROM Location ORDER BY Name ASC');

        if (machineRows.length === 0) return res.status(404).send('Machine not found');
        res.render('supply_form', {
            machine: machineRows[0],
            locations,
            formAction: `/machines/${MachineID}/supplies/new`,
            submitLabel: 'Create Supply'
        });
    } catch (err) {
        console.error('Error loading new supply form', err);
        res.status(500).send('Database error');
    }
});

// create the new supply
router.post('/machines/:MachineID/supplies/new', async (req, res) => {
    const { MachineID } = req.params;
    const { Name, Brand, Color, LocationID, SupplyType, Count, CriticalLevel, Status } = req.body;

    const connection = await pool.getConnection();
    try {

        await connection.beginTransaction();
        const [supplyResult] = await connection.query(
            `INSERT INTO Supply (MachineID, LocationID, Name, Brand, Color) VALUES (?, ?, ?, ?, ?)`,
            [MachineID, LocationID || null, Name, Brand || null, Color || null]
        );
        const newSupplyID = supplyResult.insertId;

        if (SupplyType === 'Countable') {
            await connection.query(
                `INSERT INTO CountableSupply (SupplyID, Count, CriticalLevel) VALUES (?, ?, ?)`,
                [newSupplyID, Count || 0, CriticalLevel || 0]
            );
        } 
        else if (SupplyType === 'Status') {
            await connection.query(
                `INSERT INTO StatusSupply (SupplyID, Status) VALUES (?, ?)`,
                [newSupplyID, Status ? 1 : 0]
            );
        }
        await connection.commit();
        res.redirect(`/machines/${MachineID}/supplies`);

    } catch (err) {
        await connection.rollback();
        console.error('Error creating supply', err);
        res.status(500).send('Error creating supply');
    } finally {
        connection.release();
  }
});




module.exports = router;