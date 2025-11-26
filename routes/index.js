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
        
        // Fetch worker availability for the current week with specialties
        // This query expands availability ranges to show workers on each day they're available
        // Get JavaScript date for current week calculation
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const monday = new Date(now);
        // Calculate days to subtract to get to Monday
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        monday.setDate(now.getDate() - daysToMonday);
        
        // Format as YYYY-MM-DD
        const mondayStr = monday.toISOString().split('T')[0];
        
        const [availability] = await pool.query(`
            WITH RECURSIVE dates AS (
                SELECT ? as date
                UNION ALL
                SELECT DATE_ADD(date, INTERVAL 1 DAY)
                FROM dates
                WHERE date < DATE_ADD(?, INTERVAL 4 DAY)
            )
            SELECT DISTINCT
                w.WorkerID,
                w.FirstName,
                w.LastName,
                wa.FromDate,
                wa.ToDate,
                wa.StartTime,
                wa.EndTime,
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
        `, [mondayStr, mondayStr]);
        
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
