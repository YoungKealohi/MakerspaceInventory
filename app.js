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
