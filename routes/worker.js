const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// GET /workers - List all workers
router.get("/", async (req, res) => {
  try {
    const [workers] = await pool.query("SELECT * FROM Worker ORDER BY LastName, FirstName");
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
    res.render("worker_form", {
      title: "Edit Worker",
      worker: workers[0],
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

module.exports = router;
