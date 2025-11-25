const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// list the supplies
router.get('/:MachineID/supplies', async (req, res) => {
    const { MachineID } = req.params;
    const q = req.query.q ? String(req.query.q).trim() : '';
    try {
        const [machineRows] = await pool.query('SELECT * FROM Machine WHERE MachineID = ?', [MachineID]);
        if (machineRows.length == 0) return res.status(404).send('Machine not found');

        // Build query with optional name filter
        let sql = `SELECT s.SupplyID, s.Name AS SupplyName, s.Color, s.Brand,
                        cs.Count, cs.CriticalLevel, ss.Status,
                        CASE
                                WHEN cs.SupplyID IS NOT NULL THEN 'Countable'
                                WHEN ss.SupplyID IS NOT NULL THEN 'Status'
                        END AS SupplyType
                FROM Supply s
                LEFT JOIN CountableSupply cs ON s.SupplyID = cs.SupplyID
                LEFT JOIN StatusSupply ss ON s.SupplyID = ss.SupplyID
                WHERE s.MachineID = ?`;

        const params = [MachineID];
        if (q) {
            sql += ' AND s.Name LIKE ?';
            params.push(`%${q}%`);
        }
        sql += ' ORDER BY s.SupplyID ASC';

        const [supplyRows] = await pool.query(sql, params);

        // For each supply, fetch its locations from SupplyLocation
        for (let supply of supplyRows) {
            const [locRows] = await pool.query(
                `SELECT l.LocationID, l.Name FROM SupplyLocation sl
                 LEFT JOIN Location l ON sl.LocationID = l.LocationID
                 WHERE sl.SupplyID = ? ORDER BY l.Name`,
                [supply.SupplyID]
            );
            supply.Locations = locRows;
        }

        res.render('supply', {
            machine: machineRows[0],
            supplies: supplyRows,
            q
        });
    } catch (err) {
        console.error('Error fetching machines', err);
        res.status(500).send('Database error');
    }
});

// blank new supply form
router.get('/:MachineID/supplies/new', async (req, res) => {
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
router.post('/:MachineID/supplies/new', async (req, res) => {
    const { MachineID } = req.params;
    const { Name, Brand, Color, LocationIDs, SupplyType, Count, CriticalLevel, Status } = req.body;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [supplyResult] = await connection.query(
            `INSERT INTO Supply (MachineID, Name, Brand, Color) VALUES (?, ?, ?, ?)`,
            [MachineID, Name, Brand || null, Color || null]
        );
        const newSupplyID = supplyResult.insertId;

        // Handle CountableSupply or StatusSupply
        if (SupplyType === 'Countable') {
            await connection.query(
                `INSERT INTO CountableSupply (SupplyID, Count, CriticalLevel) VALUES (?, ?, ?)`,
                [newSupplyID, Count || 0, CriticalLevel || 0]
            );
        } 
        else if (SupplyType === 'Status') {
            const statusValue = Number(Status) === 1 ? 1 : 0;
            await connection.query(
                `INSERT INTO StatusSupply (SupplyID, Status) VALUES (?, ?)`,
                [newSupplyID, statusValue]
            );
        }

        // Insert into SupplyLocation for each selected location
        if (LocationIDs && LocationIDs.length > 0) {
            const locArray = Array.isArray(LocationIDs) ? LocationIDs : [LocationIDs];
            for (let locId of locArray) {
                if (locId) {
                    await connection.query(
                        `INSERT INTO SupplyLocation (SupplyID, LocationID) VALUES (?, ?)`,
                        [newSupplyID, locId]
                    );
                }
            }
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

// edit supply form
router.get('/:MachineID/supplies/:SupplyID/edit', async (req, res) => {
    const { MachineID, SupplyID } = req.params;

    try {
        const [[machine]] = await pool.query(
            'SELECT * FROM Machine WHERE MachineID = ?',
            [MachineID]
        );
        if (!machine) return res.status(404).send('Machine not found');

        // Base supply
        const [[supply]] = await pool.query(
            `SELECT *
             FROM Supply 
             WHERE SupplyID = ? AND MachineID = ?`,
            [SupplyID, MachineID]
        );
        if (!supply) return res.status(404).send('Supply not found');

        // Check for Countable
        const [[countable]] = await pool.query(
            'SELECT * FROM CountableSupply WHERE SupplyID = ?',
            [SupplyID]
        );

        // Check for Status
        const [[status]] = await pool.query(
            'SELECT * FROM StatusSupply WHERE SupplyID = ?',
            [SupplyID]
        );

        // Load all locations
        const [locations] = await pool.query(
            'SELECT * FROM Location ORDER BY Name ASC'
        );

        // Load selected locations for this supply from SupplyLocation
        const [selectedLocations] = await pool.query(
            'SELECT LocationID FROM SupplyLocation WHERE SupplyID = ?',
            [SupplyID]
        );
        const selectedLocationIds = selectedLocations.map(row => row.LocationID);

        // Determine supply type
        let SupplyType = countable ? 'Countable' : 'Status';

        res.render('supply_form', {
            machine,
            locations,
            supply,
            countable,
            status,
            SupplyType,
            selectedLocationIds,
            formAction: `/machines/${MachineID}/supplies/${SupplyID}/edit`,
            submitLabel: 'Save Changes'
        });

    } catch (err) {
        console.error('Error loading edit supply form', err);
        res.status(500).send('Database error');
    }
});

// update supply
router.post('/:MachineID/supplies/:SupplyID/edit', async (req, res) => {
    const { MachineID, SupplyID } = req.params;
    const { Name, Brand, Color, LocationIDs, SupplyType, Count, CriticalLevel, Status } = req.body;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Update base Supply (no LocationID)
        await connection.query(
            `UPDATE Supply 
             SET Name = ?, Brand = ?, Color = ?
             WHERE SupplyID = ? AND MachineID = ?`,
            [Name, Brand, Color, SupplyID, MachineID]
        );

        // Clear existing child rows
        await connection.query(`DELETE FROM CountableSupply WHERE SupplyID = ?`, [SupplyID]);
        await connection.query(`DELETE FROM StatusSupply WHERE SupplyID = ?`, [SupplyID]);

        // Insert updated child row
        if (SupplyType === 'Countable') {
            await connection.query(
                `INSERT INTO CountableSupply (SupplyID, Count, CriticalLevel)
                 VALUES (?, ?, ?)`,
                [SupplyID, Count || 0, CriticalLevel || 0]
            );
        } else {
            const statusValue = Number(Status) === 1 ? 1 : 0;
            await connection.query(
                `INSERT INTO StatusSupply (SupplyID, Status)
                 VALUES (?, ?)`,
                [SupplyID, statusValue]
            );
        }

        // Clear and update SupplyLocation mappings
        await connection.query(`DELETE FROM SupplyLocation WHERE SupplyID = ?`, [SupplyID]);
        if (LocationIDs && LocationIDs.length > 0) {
            const locArray = Array.isArray(LocationIDs) ? LocationIDs : [LocationIDs];
            for (let locId of locArray) {
                if (locId) {
                    await connection.query(
                        `INSERT INTO SupplyLocation (SupplyID, LocationID) VALUES (?, ?)`,
                        [SupplyID, locId]
                    );
                }
            }
        }

        await connection.commit();
        res.redirect(`/machines/${MachineID}/supplies`);
    } catch (err) {
        await connection.rollback();
        console.error('Error updating supply', err);
        res.status(500).send('Error updating supply');
    } finally {
        connection.release();
    }
});

// delete supply
router.post('/:MachineID/supplies/:SupplyID/delete', async (req, res) => {
    const { MachineID, SupplyID } = req.params;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // delete child rows first
        await connection.query(`DELETE FROM CountableSupply WHERE SupplyID = ?`, [SupplyID]);
        await connection.query(`DELETE FROM StatusSupply WHERE SupplyID = ?`, [SupplyID]);
        await connection.query(`DELETE FROM SupplyLocation WHERE SupplyID = ?`, [SupplyID]);

        // delete parent supply
        await connection.query(
            `DELETE FROM Supply WHERE SupplyID = ? AND MachineID = ?`,
            [SupplyID, MachineID]
        );

        await connection.commit();
        res.redirect(`/machines/${MachineID}/supplies`);

    } catch (err) {
        await connection.rollback();
        console.error('Error deleting supply', err);
        res.status(500).send('Error deleting supply');
    } finally {
        connection.release();
    }
});



module.exports = router;