const express = require("express");
const pool = require("../db/pool");
const router = express.Router();

// GET start inventory form
router.get("/start-inventory", async (req, res) => {
  try {
    // Get all machines
    const [machines] = await pool.query("SELECT * FROM Machine ORDER BY MachineName ASC");
    // For each machine, get its supplies
    const machineSupplies = [];
    for (const machine of machines) {
      const [supplies] = await pool.query(
        `SELECT s.SupplyID, s.Name AS SupplyName, s.Brand, s.Color,
                cs.Count, cs.CriticalLevel, ss.Status,
                CASE WHEN cs.SupplyID IS NOT NULL THEN 'Countable' ELSE 'Status' END AS SupplyType
         FROM Supply s
         LEFT JOIN CountableSupply cs ON s.SupplyID = cs.SupplyID
         LEFT JOIN StatusSupply ss ON s.SupplyID = ss.SupplyID
         WHERE s.MachineID = ?
         ORDER BY s.SupplyID ASC`,
        [machine.MachineID]
      );
      machineSupplies.push({ ...machine, supplies });
    }
    res.render("start_inventory", { 
      machines: machineSupplies
    });
  } catch (err) {
    console.error("Error loading start inventory form", err);
    res.status(500).send("Database error");
  }
});

// POST start inventory
router.post("/start-inventory", async (req, res) => {
  const form = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Get all supplies
    const [supplies] = await connection.query("SELECT SupplyID FROM Supply");
    for (const { SupplyID } of supplies) {
      if (form[`count_${SupplyID}`] !== undefined) {
        // Update CountableSupply
        await connection.query(
          "UPDATE CountableSupply SET Count = ? WHERE SupplyID = ?",
          [form[`count_${SupplyID}`], SupplyID]
        );
      } else if (form[`status_${SupplyID}`] !== undefined) {
        // Update StatusSupply
        await connection.query(
          "UPDATE StatusSupply SET Status = ? WHERE SupplyID = ?",
          [form[`status_${SupplyID}`], SupplyID]
        );
      }
    }
    await connection.commit();
    res.redirect("/machines");
  } catch (err) {
    await connection.rollback();
    console.error("Error saving inventory", err);
    res.status(500).send("Error saving inventory");
  } finally {
    connection.release();
  }
});

module.exports = router;
