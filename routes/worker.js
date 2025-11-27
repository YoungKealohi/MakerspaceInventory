const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// Helper function to format time from 24-hour to 12-hour AM/PM format
function formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
}

// GET /workers - List all workers
router.get("/", async (req, res) => {
  try {
    // Get workers with their specialties
    const [workers] = await pool.query(`
      SELECT 
        w.*,
        GROUP_CONCAT(DISTINCT m.MachineName ORDER BY m.MachineName SEPARATOR ', ') as specialties
      FROM Worker w
      LEFT JOIN WorkerSpecialty ws ON w.WorkerID = ws.WorkerID
      LEFT JOIN Machine m ON ws.MachineID = m.MachineID
      GROUP BY w.WorkerID
      ORDER BY w.LastName, w.FirstName
    `);

    // Get per-day availability for each worker
    for (let worker of workers) {
      const [availability] = await pool.query(`
        SELECT DayOfWeek, StartTime, EndTime
        FROM WorkerAvailability
        WHERE WorkerID = ?
        ORDER BY DayOfWeek ASC, StartTime ASC
      `, [worker.WorkerID]);

      if (availability.length > 0) {
        // Format as "Mon 08:00-12:00<br>Tue 09:00-13:00<br>..."
        const dayNames = {2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri'};
        worker.availabilityDisplay = availability.map(a => `${dayNames[a.DayOfWeek] || a.DayOfWeek} ${formatTime(a.StartTime)}-${formatTime(a.EndTime)}`).join('<br>');
      } else {
        worker.availabilityDisplay = '—';
      }
    }

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
    machines: [],
    specialties: [],
    availabilities: [],
    formatTime: formatTime,
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
        ORDER BY DayOfWeek ASC, StartTime ASC
      `, [req.params.id]);
    
    res.render("worker_form", {
      title: "Edit Worker",
      worker: workers[0],
      machines: machines,
      specialties: specialties,
      availabilities: availabilities,
      formatTime: formatTime,
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
    const { DayOfWeek, StartTime, EndTime } = req.body;
    await pool.query(
      "INSERT INTO WorkerAvailability (WorkerID, DayOfWeek, StartTime, EndTime) VALUES (?, ?, ?, ?)",
      [req.params.id, DayOfWeek, StartTime, EndTime]
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
