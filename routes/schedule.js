const express = require("express");
const router = express.Router();

// GET /schedule - Display schedule page
router.get("/", async (req, res) => {
  try {
    res.render("schedule", {
      title: "Schedule",
      isAdmin: req.session.isAdmin
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

module.exports = router;
