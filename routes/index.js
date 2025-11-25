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
        
        res.render('index', { 
            title: "Welcome", 
            page: "index",
            machines: machines 
        });
    } catch (err) {
        console.error(err);
        res.render('index', { 
            title: "Welcome", 
            page: "index",
            machines: [] 
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
