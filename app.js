const express = require("express");
const path = require("path");
const indexRouter = require("./routes/index");
const machinesRouter = require("./routes/machines");
const suppliesRouter = require("./routes/supply");
const locationsRouter = require("./routes/locations");
const startInventoryRouter = require("./routes/start_inventory");
const workerRouter = require("./routes/worker");
const lowStockRouter = require("./routes/low_stock");

const session = require('express-session');
const pool = require('./db/pool');

const app = express();
const port = 3000;
app.use(express.json());
app.use(
    express.urlencoded({
        extended: true,
    })
);

app.use(session({
  secret: 'yourSecretKey', // use a strong secret in production!
  resave: false,
  saveUninitialized: false, // Don't create session until something stored
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Make session available in all templates via res.locals.session
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Keep session.isAdmin fresh by checking the DB on each request when a workerId is present.
// This avoids requiring users to re-login when their admin flag changes.
app.use(async (req, res, next) => {
  try {
    if (req.session?.workerId) {
  const [rows] = await pool.query('SELECT IsAdmin FROM Worker WHERE WorkerID = ?', [req.session.workerId]);
  req.session.isAdmin = rows && rows[0] ? !!rows[0].IsAdmin : false;
      // ensure res.locals has the updated session
      res.locals.session = req.session;
    }
  } catch (err) {
    console.error('Error refreshing session isAdmin flag:', err);
  }
  next();
});


app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));


app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/locations', locationsRouter);
app.use('/machines', suppliesRouter);
app.use('/machines', machinesRouter);
app.use('/', startInventoryRouter);
app.use('/workers', workerRouter);
app.use('/low-stock-report', lowStockRouter);

app.listen(port, () => {
 console.log(`Example app listening at http://localhost:${port}`);
});
