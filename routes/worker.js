const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// GET /workers - List all workers
router.get("/", async (req, res) => {
  try {
    // Get workers with their specialties and availability count
    const [workers] = await pool.query(`
      SELECT 
        w.*,
        GROUP_CONCAT(DISTINCT m.MachineName ORDER BY m.MachineName SEPARATOR ', ') as specialties,
        COUNT(DISTINCT wa.WorkerAvailabilityID) as availabilityCount
      FROM Worker w
      LEFT JOIN WorkerSpecialty ws ON w.WorkerID = ws.WorkerID
      LEFT JOIN Machine m ON ws.MachineID = m.MachineID
      LEFT JOIN WorkerAvailability wa ON w.WorkerID = wa.WorkerID
      GROUP BY w.WorkerID
      ORDER BY w.LastName, w.FirstName
    `);
    
    res.render("workers", {
      title: "Workers",
      workers: workers,
      isAdmin: req.session.isAdmin
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// GET /workers/new - Show form to add new worker
router.get("/new", (req, res) => {
  res.render("worker_form", {
    title: "Add Worker",
    worker: null,
    formAction: "/workers/new",
    submitLabel: "Add Worker"
  });
});

// POST /workers/new - Create new worker
router.post("/new", async (req, res) => {
  try {
    const { FirstName, LastName, IsBoss, PhoneNumber, Email } = req.body;
    await pool.query(
      "INSERT INTO Worker (FirstName, LastName, IsBoss, PhoneNumber, Email) VALUES (?, ?, ?, ?, ?)",
      [FirstName, LastName, IsBoss ? 1 : 0, PhoneNumber || null, Email || null]
    );
    res.redirect("/workers");
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// GET /workers/:id/edit - Show form to edit worker
router.get("/:id/edit", async (req, res) => {
  try {
    const [workers] = await pool.query("SELECT * FROM Worker WHERE WorkerID = ?", [req.params.id]);
    if (workers.length === 0) {
      return res.status(404).send("Worker not found");
    }
    
    // Get all machines for specialty selection
    const [machines] = await pool.query("SELECT MachineID, MachineName FROM Machine ORDER BY MachineName");
    
    // Get worker's current specialties
    const [specialties] = await pool.query(`
      SELECT ws.*, m.MachineName 
      FROM WorkerSpecialty ws
      JOIN Machine m ON ws.MachineID = m.MachineID
      WHERE ws.WorkerID = ?
    `, [req.params.id]);
    
    // Get worker's availability
    const [availabilities] = await pool.query(`
      SELECT * FROM WorkerAvailability 
      WHERE WorkerID = ?
      ORDER BY FromDate DESC, StartTime DESC
    `, [req.params.id]);
    
    res.render("worker_form", {
      title: "Edit Worker",
      worker: workers[0],
      machines: machines,
      specialties: specialties,
      availabilities: availabilities,
      formAction: `/workers/${req.params.id}/edit`,
      submitLabel: "Update Worker"
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// POST /workers/:id/edit - Update worker
router.post("/:id/edit", async (req, res) => {
  try {
    const { FirstName, LastName, IsBoss, PhoneNumber, Email } = req.body;
    await pool.query(
      "UPDATE Worker SET FirstName = ?, LastName = ?, IsBoss = ?, PhoneNumber = ?, Email = ? WHERE WorkerID = ?",
      [FirstName, LastName, IsBoss ? 1 : 0, PhoneNumber || null, Email || null, req.params.id]
    );
    res.redirect("/workers");
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// POST /workers/delete/:id - Delete worker
router.post("/delete/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM Worker WHERE WorkerID = ?", [req.params.id]);
    res.redirect("/workers");
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// POST /workers/:id/add-specialty - Add specialty
router.post("/:id/add-specialty", async (req, res) => {
  try {
    const { MachineID } = req.body;
    await pool.query(
      "INSERT INTO WorkerSpecialty (WorkerID, MachineID) VALUES (?, ?)",
      [req.params.id, MachineID]
    );
    res.redirect(`/workers/${req.params.id}/edit`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// POST /workers/:workerId/delete-specialty/:specialtyId - Delete specialty
router.post("/:workerId/delete-specialty/:specialtyId", async (req, res) => {
  try {
    await pool.query("DELETE FROM WorkerSpecialty WHERE WorkerSpecialtyID = ?", [req.params.specialtyId]);
    res.redirect(`/workers/${req.params.workerId}/edit`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// POST /workers/:id/add-availability - Add availability
router.post("/:id/add-availability", async (req, res) => {
  try {
    const { FromDate, ToDate, StartTime, EndTime } = req.body;
    await pool.query(
      "INSERT INTO WorkerAvailability (WorkerID, FromDate, ToDate, StartTime, EndTime) VALUES (?, ?, ?, ?, ?)",
      [req.params.id, FromDate, ToDate, StartTime, EndTime]
    );
    res.redirect(`/workers/${req.params.id}/edit`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// POST /workers/:workerId/delete-availability/:availabilityId - Delete availability
router.post("/:workerId/delete-availability/:availabilityId", async (req, res) => {
  try {
    await pool.query("DELETE FROM WorkerAvailability WHERE WorkerAvailabilityID = ?", [req.params.availabilityId]);
    res.redirect(`/workers/${req.params.workerId}/edit`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

module.exports = router;
