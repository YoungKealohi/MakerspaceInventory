const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { requireAdmin, requireSelfOrAdmin } = require('../middleware/auth');

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

    // Determine whether the current viewer is an admin.
    // Prefer the session value (covers legacy 'admin' username logins which don't have a WorkerID),
    // otherwise fall back to a fresh DB lookup when a workerId exists.
    let viewerIsAdmin = !!req.session?.isAdmin;
    try {
      if (!viewerIsAdmin && req.session?.workerId) {
        const [viewerRows] = await pool.query('SELECT IsAdmin FROM Worker WHERE WorkerID = ?', [req.session.workerId]);
        viewerIsAdmin = viewerRows && viewerRows[0] ? !!viewerRows[0].IsAdmin : false;
      }
    } catch (e) {
      console.error('Error checking viewer admin status:', e);
      // keep whatever we have from the session
    }

    console.log('Rendering /workers for session.workerId=', req.session?.workerId, 'viewerIsAdmin=', viewerIsAdmin);
    // Pass a consistent `isAdmin` variable into the template (and keep viewerIsAdmin for backward compat)
    res.render("workers", {
      title: "Workers",
      workers: workers,
      viewerIsAdmin,
      isAdmin: viewerIsAdmin
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// GET /workers/new - Show form to add new worker (admins only)
router.get("/new", requireAdmin, async (req, res) => {
  try {
    // fetch machines so specialties can be selected when creating
    const [machines] = await pool.query("SELECT MachineID, MachineName FROM Machine ORDER BY MachineName");
    res.render("worker_form", {
      title: "Add Worker",
      worker: null,
      machines: machines,
      specialties: [],
      availabilities: [],
      formatTime: formatTime,
      formAction: "/workers/new",
      submitLabel: "Add Worker",
      isAdmin: req.session?.isAdmin || false
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

// POST /workers/new - Create new worker (admins only)
router.post("/new", requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { FirstName, LastName, IsBoss, IsAdmin, PhoneNumber, Email, MachineIDs, availability } = req.body;
    // Only admins may set IsAdmin on create via the form. The route itself is admin-only so it's safe.
    const isAdminValue = IsAdmin ? 1 : 0;
    const [result] = await connection.query(
      "INSERT INTO Worker (FirstName, LastName, IsBoss, IsAdmin, PhoneNumber, Email) VALUES (?, ?, ?, ?, ?, ?)",
      [FirstName, LastName, IsBoss ? 1 : 0, isAdminValue, PhoneNumber || null, Email || null]
    );
    const workerId = result.insertId;

    // Insert specialties if provided
    if (MachineIDs) {
      const machineIds = Array.isArray(MachineIDs) ? MachineIDs : [MachineIDs];
      for (const machineId of machineIds) {
        await connection.query(
          "INSERT INTO WorkerSpecialty (WorkerID, MachineID) VALUES (?, ?)",
          [workerId, machineId]
        );
      }
    }

    // Insert availabilities if provided
    if (availability) {
      for (const key in availability) {
        const avail = availability[key];
        if (avail.day && avail.start && avail.end) {
          await connection.query(
            "INSERT INTO WorkerAvailability (WorkerID, DayOfWeek, StartTime, EndTime) VALUES (?, ?, ?, ?)",
            [workerId, avail.day, avail.start, avail.end]
          );
        }
      }
    }

    await connection.commit();
    res.redirect('/workers');
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).send("Database error");
  } finally {
    connection.release();
  }
});

// GET /workers/:id/edit - Show form to edit worker (admins or the worker themselves)
router.get("/:id/edit", requireSelfOrAdmin, async (req, res) => {
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
      submitLabel: "Update Worker",
      // tell the form whether the viewer is an admin so the form can show/hide IsAdmin
      isAdmin: req.session?.isAdmin || false
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// POST /workers/:id/edit - Update worker (admins or the worker themselves)
router.post("/:id/edit", requireSelfOrAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
  const { FirstName, LastName, IsBoss, IsAdmin, PhoneNumber, Email, MachineIDs, availability } = req.body;

    // Fetch current IsAdmin for audit and self-demotion check
    const [currentRows] = await connection.query("SELECT IsBoss, IsAdmin FROM Worker WHERE WorkerID = ?", [req.params.id]);
    const current = currentRows && currentRows[0] ? currentRows[0] : { IsBoss: 0, IsAdmin: 0 };
    const oldIsAdmin = current.IsAdmin ? 1 : 0;

    // If the editor is not an admin, preserve IsBoss and IsAdmin values from DB (don't allow non-admins to change these flags)
    let isBossValue = IsBoss ? 1 : 0;
    let isAdminValue = IsAdmin ? 1 : 0;
    if (!req.session?.isAdmin) {
      isBossValue = current.IsBoss ? 1 : 0;
      isAdminValue = oldIsAdmin;
    }

    // Prevent an admin from removing their own admin rights via the edit form
    if (req.session?.workerId && Number(req.session.workerId) === Number(req.params.id) && req.session?.isAdmin && isAdminValue === 0 && oldIsAdmin === 1) {
      await connection.rollback();
      return res.status(400).send('Cannot remove your own admin rights');
    }

    // Update worker details (only allowed after authorization check)
    await connection.query(
      "UPDATE Worker SET FirstName = ?, LastName = ?, IsBoss = ?, IsAdmin = ?, PhoneNumber = ?, Email = ? WHERE WorkerID = ?",
      [FirstName, LastName, isBossValue, isAdminValue, PhoneNumber || null, Email || null, req.params.id]
    );
    
    // Update specialties - delete all and re-insert
    await connection.query("DELETE FROM WorkerSpecialty WHERE WorkerID = ?", [req.params.id]);
    if (MachineIDs) {
      const machineIds = Array.isArray(MachineIDs) ? MachineIDs : [MachineIDs];
      for (const machineId of machineIds) {
        await connection.query(
          "INSERT INTO WorkerSpecialty (WorkerID, MachineID) VALUES (?, ?)",
          [req.params.id, machineId]
        );
      }
    }
    
    // Update availabilities - delete all and re-insert
    await connection.query("DELETE FROM WorkerAvailability WHERE WorkerID = ?", [req.params.id]);
    if (availability) {
      for (const key in availability) {
        const avail = availability[key];
        if (avail.day && avail.start && avail.end) {
          await connection.query(
            "INSERT INTO WorkerAvailability (WorkerID, DayOfWeek, StartTime, EndTime) VALUES (?, ?, ?, ?)",
            [req.params.id, avail.day, avail.start, avail.end]
          );
        }
      }
    }
    
    await connection.commit();

    // If IsAdmin changed and the editor is an admin, insert an audit row
    try {
      if (req.session?.isAdmin && (isAdminValue !== oldIsAdmin)) {
        const actorId = req.session.workerId || null;
        await pool.query(
          "INSERT INTO AdminAudit (ActorWorkerID, TargetWorkerID, OldValue, NewValue, CreatedAt) VALUES (?, ?, ?, ?, NOW())",
          [actorId, req.params.id, oldIsAdmin, isAdminValue]
        );
      }
    } catch (auditErr) {
      console.error('Failed to write AdminAudit row:', auditErr);
      // don't fail the whole request for an audit insert failure
    }

    res.redirect("/workers");
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).send("Database error");
  } finally {
    connection.release();
  }
});

// POST /workers/delete/:id - Delete worker (admins only)
router.post("/delete/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM Worker WHERE WorkerID = ?", [req.params.id]);
    res.redirect("/workers");
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// POST /workers/toggle-admin/:id - Grant or revoke admin rights (admins only)
router.post('/toggle-admin/:id', requireAdmin, async (req, res) => {
  try {
    const setAdmin = req.body && req.body.setAdmin === '1' ? 1 : 0;
    const targetId = Number(req.params.id);
    // Prevent an admin from removing their own admin rights to avoid accidental lockout
    if (req.session?.workerId && req.session.workerId === targetId && setAdmin === 0) {
      return res.status(400).send('Cannot remove your own admin rights');
    }
    await pool.query('UPDATE Worker SET IsAdmin = ? WHERE WorkerID = ?', [setAdmin, req.params.id]);
    res.redirect('/workers');
  } catch (err) {
    console.error('Error toggling admin flag:', err);
    res.status(500).send('Database error');
  }
});

module.exports = router;

