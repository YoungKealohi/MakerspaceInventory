const express = require("express");
const path = require("path");
const indexRouter = require("./routes/index");
const machinesRouter = require("./routes/machines");
const suppliesRouter = require("./routes/supply");
const locationsRouter = require("./routes/locations");
const startInventoryRouter = require("./routes/start_inventory");
const scheduleRouter = require("./routes/schedule");
const workerRouter = require("./routes/worker");

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
  saveUninitialized: true
}));


app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));


app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/locations', locationsRouter);
app.use('/supply', suppliesRouter);
app.use('/machines', machinesRouter);
app.use('/', startInventoryRouter);
app.use('/schedule', scheduleRouter);
app.use('/workers', workerRouter);

app.listen(port, () => {
 console.log(`Example app listening at http://localhost:${port}`);
});
