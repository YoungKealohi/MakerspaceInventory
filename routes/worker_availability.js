const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// GET /worker-availability/:workerId - View availability for a worker
router.get("/:workerId", async (req, res) => {
  try {
    const workerId = req.params.workerId;
    
    // Get worker info
    const [workers] = await pool.query("SELECT * FROM Worker WHERE WorkerID = ?", [workerId]);
    if (workers.length === 0) {
      return res.status(404).send("Worker not found");
    }
    const worker = workers[0];
    
    // Get worker's availability
    const [availabilities] = await pool.query(`
      SELECT * 
      FROM WorkerAvailability 
      WHERE WorkerID = ?
      ORDER BY FromDate DESC, StartTime
    `, [workerId]);
    
    res.render("worker_availability", {
      title: `${worker.FirstName} ${worker.LastName} - Availability`,
      worker: worker,
      availabilities: availabilities,
      isAdmin: req.session.isAdmin
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// POST /worker-availability/:workerId/add - Add availability
router.post("/:workerId/add", async (req, res) => {
  try {
    const { Availability } = req.body;
    await pool.query(
      "INSERT INTO WorkerAvailability (WorkerID, Availability) VALUES (?, ?)",
      [req.params.workerId, Availability]
    );
    res.redirect(`/worker-availability/${req.params.workerId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// POST /worker-availability/delete/:id - Delete availability
router.post("/delete/:id", async (req, res) => {
  try {
    // Get the WorkerID before deleting
    const [availability] = await pool.query("SELECT WorkerID FROM WorkerAvailability WHERE WorkerAvailabilityID = ?", [req.params.id]);
    await pool.query("DELETE FROM WorkerAvailability WHERE WorkerAvailabilityID = ?", [req.params.id]);
    res.redirect(`/worker-availability/${availability[0].WorkerID}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

module.exports = router;
