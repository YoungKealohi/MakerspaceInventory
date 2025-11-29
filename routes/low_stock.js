const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// GET /low-stock-report - Show report of supplies that need to be reordered
router.get("/", async (req, res) => {
  try {
    const query = `
    SELECT 
      s.SupplyID,
      s.Name AS SupplyName,
      s.Color,
      s.Brand,
      m.MachineName,
      cs.Count,
      cs.CriticalLevel,
      ss.Status,
      CASE
        WHEN cs.SupplyID IS NOT NULL THEN 'Countable'
        WHEN ss.SupplyID IS NOT NULL THEN 'Status'
      END AS SupplyType
    FROM Supply s
    LEFT JOIN Machine m ON s.MachineID = m.MachineID
    LEFT JOIN CountableSupply cs ON s.SupplyID = cs.SupplyID
    LEFT JOIN StatusSupply ss ON s.SupplyID = ss.SupplyID
    WHERE 
      (cs.Count IS NOT NULL AND cs.Count <= cs.CriticalLevel)
      OR 
      (ss.Status IS NOT NULL AND ss.Status = 0)
    GROUP BY s.SupplyID
    ORDER BY m.MachineName, s.Name
    `;
    const query2 = `SELECT FirstName, Email FROM Worker WHERE IsBoss = 1`;

    const [supplies] = await pool.query(query);
    const [bosses] = await pool.query(query2);
    const reportText = formatReportText(supplies);
    
    res.render("low_stock_report", {
      title: "Low Stock Report",
      supplies: supplies,
      bosses: bosses,
      reportText: reportText
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

function formatReportText(supplies) {
  if (supplies.length === 0) {
    return 'All supplies are currently at acceptable levels. No items need to be reordered at this time.';
  }

  let body = 'The following supplies need to be reordered:\n\n';
  
  supplies.forEach((supply, index) => {
    body += `${index + 1}. ${supply.SupplyName}`;
    
    if (supply.Color) {
      body += ` (${supply.Color})`;
    }
    
    if (supply.Brand) {
      body += ` - Brand: ${supply.Brand}`;
    }
    
    body += `\n   Machine: ${supply.MachineName || 'N/A'}\n`;
    
    if (supply.SupplyType === 'Countable') {
      body += `   Current Stock: ${supply.Count} (Critical Level: ${supply.CriticalLevel})\n`;
    } else {
      body += `   Status: Need More\n`;
    }
    
    if (supply.Locations) {
      body += `   Location(s): ${supply.Locations}\n`;
    }
    
    body += '\n';
  });
  
  return body;
}

module.exports = router;
