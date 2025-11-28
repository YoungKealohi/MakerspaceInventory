const express = require("express");
const router = express.Router();
const { getLowStockSupplies, formatReportText } = require("./supply");

// GET /low-stock-report - Show report of supplies that need to be reordered
router.get("/", async (req, res) => {
  try {
    const supplies = await getLowStockSupplies();
    const reportText = formatReportText(supplies);
    
    res.render("low_stock_report", {
      title: "Low Stock Report",
      supplies: supplies,
      reportText: reportText,
      isAdmin: req.session.isAdmin
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

module.exports = router;
