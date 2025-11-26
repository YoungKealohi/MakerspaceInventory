const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// Hardcoded users
const users = [
    { username: 'admin', password: 'admin123' },
    { username: 'user', password: 'user123' }
];

router.get('/', async (req, res) => {
    try {
        // Fetch all machines with their status
        const [machines] = await pool.query(`
            SELECT MachineID, MachineName, WorkingStatus, Model, SerialNumber 
            FROM Machine 
            ORDER BY MachineName
        `);
        
        // Fetch worker availability for multiple weeks (4 weeks back, 8 weeks forward)
        // This query expands availability ranges to show workers on each day they're available
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        // Start date: 4 weeks before current Monday
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - daysToMonday - (4 * 7));
        const startDateStr = startDate.toISOString().split('T')[0];
        
        // End date: 8 weeks after current Monday
        const endDate = new Date(now);
        endDate.setDate(now.getDate() - daysToMonday + (8 * 7));
        const endDateStr = endDate.toISOString().split('T')[0];
        
        const [availability] = await pool.query(`
            WITH RECURSIVE dates AS (
                SELECT ? as date
                UNION ALL
                SELECT DATE_ADD(date, INTERVAL 1 DAY)
                FROM dates
                WHERE date <= ?
            )
            SELECT DISTINCT
                w.WorkerID,
                w.FirstName,
                w.LastName,
                wa.FromDate,
                wa.ToDate,
                wa.StartTime,
                wa.EndTime,
                d.date as AvailableDate,
                DAYOFWEEK(d.date) as DayOfWeek,
                GROUP_CONCAT(DISTINCT m.MachineName ORDER BY m.MachineName SEPARATOR ', ') as specialties
            FROM dates d
            CROSS JOIN Worker w
            JOIN WorkerAvailability wa ON w.WorkerID = wa.WorkerID
            LEFT JOIN WorkerSpecialty ws ON w.WorkerID = ws.WorkerID
            LEFT JOIN Machine m ON ws.MachineID = m.MachineID
            WHERE d.date BETWEEN DATE(wa.FromDate) AND DATE(wa.ToDate)
              AND DAYOFWEEK(d.date) BETWEEN 2 AND 6
            GROUP BY w.WorkerID, wa.WorkerAvailabilityID, d.date, wa.FromDate, wa.ToDate, wa.StartTime, wa.EndTime
            ORDER BY d.date, w.LastName, w.FirstName
        `, [startDateStr, endDateStr]);
        
        console.log('=== INDEX ROUTE DEBUG ===');
        console.log('Date range:', startDateStr, 'to', endDateStr);
        console.log('Availability records found:', availability.length);
        if (availability.length > 0) {
            console.log('First 3 records:');
            availability.slice(0, 3).forEach(a => {
                console.log(`  ${a.FirstName} ${a.LastName} - ${a.AvailableDate} (${a.DayOfWeek})`);
            });
        }
        
        res.render('index', { 
            title: "Welcome", 
            page: "index",
            machines: machines,
            availability: availability 
        });
    } catch (err) {
        console.error(err);
        res.render('index', { 
            title: "Welcome", 
            page: "index",
            machines: [],
            availability: [] 
        });
    }
});

// GET login page
router.get('/login', (req, res) => {
    res.render('login', { title: "Login", error: null });
});

// POST login authentication
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Check if user exists
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        req.session.username = username; // <-- set username in session
        // Successful login - redirect to machines page
        res.redirect('/machines');
    } else {
        // Failed login - show error
        res.render('login', { 
            title: "Login", 
            error: "Invalid username or password" 
        });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

module.exports = router;
