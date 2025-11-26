const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// GET /worker-specialty/:workerId - View specialties for a worker
router.get("/:workerId", async (req, res) => {
  try {
    const workerId = req.params.workerId;
    
    // Get worker info
    const [workers] = await pool.query("SELECT * FROM Worker WHERE WorkerID = ?", [workerId]);
    if (workers.length === 0) {
      return res.status(404).send("Worker not found");
    }
    const worker = workers[0];
    
    // Get worker's specialties
    const [specialties] = await pool.query(`
      SELECT ws.*, m.MachineName 
      FROM WorkerSpecialty ws
      JOIN Machine m ON ws.MachineID = m.MachineID
      WHERE ws.WorkerID = ?
    `, [workerId]);
    
    // Get all machines for the dropdown
    const [allMachines] = await pool.query("SELECT MachineID, MachineName FROM Machine ORDER BY MachineName");
    
    res.render("worker_specialty", {
      title: `${worker.FirstName} ${worker.LastName} - Specialties`,
      worker: worker,
      specialties: specialties,
      allMachines: allMachines,
      isAdmin: req.session.isAdmin
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// POST /worker-specialty/:workerId/add - Add a specialty
router.post("/:workerId/add", async (req, res) => {
  try {
    const { MachineID } = req.body;
    await pool.query(
      "INSERT INTO WorkerSpecialty (WorkerID, MachineID) VALUES (?, ?)",
      [req.params.workerId, MachineID]
    );
    res.redirect(`/worker-specialty/${req.params.workerId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// POST /worker-specialty/delete/:id - Delete a specialty
router.post("/delete/:id", async (req, res) => {
  try {
    // Get the WorkerID before deleting
    const [specialty] = await pool.query("SELECT WorkerID FROM WorkerSpecialty WHERE WorkerSpecialtyID = ?", [req.params.id]);
    await pool.query("DELETE FROM WorkerSpecialty WHERE WorkerSpecialtyID = ?", [req.params.id]);
    res.redirect(`/worker-specialty/${specialty[0].WorkerID}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

module.exports = router;
