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

// Hardcoded users
const users = [
    { username: 'admin', password: 'admin123' },
    { username: 'user', password: 'user123' }
];

router.get('/', async (req, res) => {
    try {
        // Fetch all machines with their status
        const [machines] = await pool.query('SELECT * FROM Machine ORDER BY MachineName');

        // Fetch today's worker schedule (name, specialty, availability, time)
        let today = new Date();
        let todayDayOfWeek = today.getDay(); // JavaScript: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, etc.
        
        // If today is weekend, show Monday's schedule instead
        if (todayDayOfWeek === 0) { // Sunday, show Monday
            today.setDate(today.getDate() + 1);
            todayDayOfWeek = 1;
        } else if (todayDayOfWeek === 6) { // Saturday, show Monday
            today.setDate(today.getDate() + 2);
            todayDayOfWeek = 1;
        }
        
        // Convert JavaScript day (0-6) to MySQL DAYOFWEEK (1-7): 1=Sunday, 2=Monday, etc.
        const mysqlDayOfWeek = todayDayOfWeek + 1;
        
        // Get current weekday name
        const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentWeekday = weekdayNames[todayDayOfWeek];

        // Query workers available on the current day of week
        const [schedule] = await pool.query(`
            SELECT w.WorkerID, w.FirstName, w.LastName,
                   wa.StartTime, wa.EndTime, wa.DayOfWeek,
                   GROUP_CONCAT(DISTINCT m.MachineName ORDER BY m.MachineName SEPARATOR ', ') AS specialties
            FROM Worker w
            JOIN WorkerAvailability wa ON w.WorkerID = wa.WorkerID
            LEFT JOIN WorkerSpecialty ws ON w.WorkerID = ws.WorkerID
            LEFT JOIN Machine m ON ws.MachineID = m.MachineID
            WHERE wa.DayOfWeek = ?
            GROUP BY w.WorkerID, wa.WorkerAvailabilityID, wa.StartTime, wa.EndTime, wa.DayOfWeek
            ORDER BY w.LastName, w.FirstName, wa.StartTime
        `, [mysqlDayOfWeek]);

        // Format times for display
        const formattedSchedule = schedule.map(worker => ({
            ...worker,
            StartTime: formatTime(worker.StartTime),
            EndTime: formatTime(worker.EndTime)
        }));

        res.render('index', {
            title: "Welcome",
            page: "index",
            machines: machines,
            schedule: formattedSchedule,
            currentWeekday: currentWeekday
        });
    } catch (err) {
        console.error('ERROR on homepage:', err);
        res.render('index', {
            title: "Welcome",
            page: "index",
            machines: [],
            schedule: [],
            currentWeekday: 'Today'
        });
    }
});

// API endpoint to get schedule for a specific day offset
router.get('/api/schedule', async (req, res) => {
    try {
        const dayOffset = parseInt(req.query.dayOffset) || 0;
        
        // Calculate the target date
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + dayOffset);
        
        const targetDayOfWeek = targetDate.getDay(); // JavaScript: 0=Sunday, 1=Monday, etc.
        const mysqlDayOfWeek = targetDayOfWeek + 1; // MySQL: 1=Sunday, 2=Monday, etc.
        
        // Get weekday name
        const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const weekdayName = weekdayNames[targetDayOfWeek];
        
        // Query workers available on the target day of week
        const [schedule] = await pool.query(`
            SELECT w.WorkerID, w.FirstName, w.LastName,
                   wa.StartTime, wa.EndTime, wa.DayOfWeek,
                   GROUP_CONCAT(DISTINCT m.MachineName ORDER BY m.MachineName SEPARATOR ', ') AS specialties
            FROM Worker w
            JOIN WorkerAvailability wa ON w.WorkerID = wa.WorkerID
            LEFT JOIN WorkerSpecialty ws ON w.WorkerID = ws.WorkerID
            LEFT JOIN Machine m ON ws.MachineID = m.MachineID
            WHERE wa.DayOfWeek = ?
            GROUP BY w.WorkerID, wa.WorkerAvailabilityID, wa.StartTime, wa.EndTime, wa.DayOfWeek
            ORDER BY w.LastName, w.FirstName, wa.StartTime
        `, [mysqlDayOfWeek]);
        
        // Format times for display
        const formattedSchedule = schedule.map(worker => ({
            ...worker,
            StartTime: formatTime(worker.StartTime),
            EndTime: formatTime(worker.EndTime)
        }));
        
        res.json({
            weekdayName: weekdayName,
            schedule: formattedSchedule
        });
    } catch (err) {
        console.error('ERROR fetching schedule:', err);
        res.status(500).json({ error: 'Failed to fetch schedule' });
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
