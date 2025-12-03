const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const bcrypt = require('bcryptjs');

// Helper function to format time from 24-hour to 12-hour AM/PM format
function formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
}

// Hardcoded users (admin fallback)
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
            SELECT w.WorkerID, w.FirstName,
                   wa.StartTime, wa.EndTime, wa.DayOfWeek,
                   GROUP_CONCAT(DISTINCT m.MachineName ORDER BY m.MachineName SEPARATOR ', ') AS specialties
            FROM Worker w
            JOIN WorkerAvailability wa ON w.WorkerID = wa.WorkerID
            LEFT JOIN WorkerSpecialty ws ON w.WorkerID = ws.WorkerID
            LEFT JOIN Machine m ON ws.MachineID = m.MachineID
            WHERE wa.DayOfWeek = ?
            GROUP BY w.WorkerID, wa.WorkerAvailabilityID, wa.StartTime, wa.EndTime, wa.DayOfWeek
            ORDER BY wa.StartTime, w.FirstName
        `, [mysqlDayOfWeek]);

        // Format times for display
        const formattedSchedule = schedule.map(worker => ({
            ...worker,
            StartTime: formatTime(worker.StartTime),
            EndTime: formatTime(worker.EndTime)
        }));

        // Compute makerspace hours per weekday from WorkerAvailability
        const [hoursRows] = await pool.query(`
                SELECT 
                    DayOfWeek, 
                    TIME_FORMAT(MIN(StartTime), '%H:%i') AS OpenTime, 
                    TIME_FORMAT(MAX(EndTime), '%H:%i') AS CloseTime
                FROM WorkerAvailability
                GROUP BY DayOfWeek
        `);
        const dayNameMap = {1:'Sunday',2:'Monday',3:'Tuesday',4:'Wednesday',5:'Thursday',6:'Friday',7:'Saturday'};
        const makerspaceHours = {};
        for (const row of hoursRows) {
            makerspaceHours[dayNameMap[row.DayOfWeek]] = {
                open: row.OpenTime ? formatTime(row.OpenTime) : 'Closed',
                close: row.CloseTime ? formatTime(row.CloseTime) : ''
            };
        }

        res.render('index', {
            title: "Welcome",
            page: "index",
            machines: machines,
            schedule: formattedSchedule,
            currentWeekday: currentWeekday,
            makerspaceHours,
            isAdmin: req.session?.isAdmin || false
        });
    } catch (err) {
        console.error('ERROR on homepage:', err);
        res.render('index', {
            title: "Welcome",
            page: "index",
            machines: [],
            schedule: [],
            currentWeekday: 'Today',
            makerspaceHours: {},
            isAdmin: req.session?.isAdmin || false
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
            SELECT w.WorkerID, w.FirstName,
                   wa.StartTime, wa.EndTime, wa.DayOfWeek,
                   GROUP_CONCAT(DISTINCT m.MachineName ORDER BY m.MachineName SEPARATOR ', ') AS specialties
            FROM Worker w
            JOIN WorkerAvailability wa ON w.WorkerID = wa.WorkerID
            LEFT JOIN WorkerSpecialty ws ON w.WorkerID = ws.WorkerID
            LEFT JOIN Machine m ON ws.MachineID = m.MachineID
            WHERE wa.DayOfWeek = ?
            GROUP BY w.WorkerID, wa.WorkerAvailabilityID, wa.StartTime, wa.EndTime, wa.DayOfWeek
            ORDER BY wa.StartTime, w.FirstName
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
router.post('/login', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        // If email supplied, attempt worker login
        if (email) {
            const [rows] = await pool.query('SELECT WorkerID, Email, PasswordHash, FirstName, MustChangePassword FROM Worker WHERE Email = ?', [email]);
            if (rows && rows.length > 0) {
                const worker = rows[0];
                if (worker.PasswordHash && await bcrypt.compare(password, worker.PasswordHash)) {
                    req.session.username = worker.FirstName;
                    req.session.isAdmin = false;
                    req.session.workerId = worker.WorkerID;
                    // persist whether the worker must change password in the session
                    req.session.mustChangePassword = !!worker.MustChangePassword;
                    // If they must change password, send them to change screen
                    if (worker.MustChangePassword) return req.session.save(() => res.redirect('/change-password'));
                    // Ensure session is saved before redirecting to the main dashboard
                    return req.session.save(err => {
                        if (err) console.error('Session save error:', err);
                        return res.redirect('/machines');
                    });
                }
            }
            return res.render('login', { title: 'Login', error: 'Invalid email or password' });
        }

        // Fallback to legacy username
        if (username) {
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                req.session.username = username;
                req.session.isAdmin = (username === 'admin');
                return req.session.save(err => {
                    if (err) console.error('Session save error:', err);
                    return res.redirect('/machines');
                });
            }
        }

        return res.render('login', { title: 'Login', error: 'Invalid credentials' });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).render('login', { title: 'Login', error: 'Server error during login' });
    }
});

// Change password (worker only)
router.get('/change-password', (req, res) => {
    if (!req.session?.workerId) return res.redirect('/login');
    res.render('change_password', { title: 'Change Password', error: null });
});

router.post('/change-password', async (req, res) => {
    try {
        const workerId = req.session?.workerId;
        if (!workerId) return res.redirect('/login');
        const { password, confirm } = req.body;
        if (!password || password !== confirm) return res.render('change_password', { title: 'Change Password', error: 'Passwords do not match' });
        const hash = await bcrypt.hash(password, 10);
        await pool.query('UPDATE Worker SET PasswordHash = ?, MustChangePassword = 0 WHERE WorkerID = ?', [hash, workerId]);
        // Clear the session flag and ensure the session is saved before redirecting to the dashboard
        req.session.mustChangePassword = false;
        return req.session.save(err => {
            if (err) console.error('Session save error after password change:', err);
            return res.redirect('/machines');
        });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).render('change_password', { title: 'Change Password', error: 'Server error' });
    }
});

// Profile page (protected)
router.get('/profile', (req, res) => {
    // allow either a logged-in worker or admin (legacy)
    if (!req.session?.workerId && !req.session?.isAdmin) return res.redirect('/login');
    res.render('profile', { title: 'Profile' });
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Debug: return current session (helpful to check login state)
router.get('/session', (req, res) => {
    res.json({ session: req.session || null });
});

module.exports = router;
