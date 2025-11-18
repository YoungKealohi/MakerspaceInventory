const express = require("express");
const path = require("path");
const indexRouter = require("./routes/index");
const machinesRouter = require("./routes/machines");
const suppliesRouter = require("./routes/supply");
const locationsRouter = require("./routes/location");

const app = express();
const port = 3000;
app.use(express.json());
app.use(
    express.urlencoded({
        extended: true,
    })
);




app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
app.use('/', suppliesRouter);
app.use('/machines', machinesRouter);
app.use('/locations', locationsRouter);

/*
app.use(async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT MachineID, MachineName FROM Machine");
    res.locals.machines = rows;
    next();
  } catch (err) {
    console.error(err);
    res.locals.machines = [];
    next();
  }
});
*/

app.listen(port, () => {
 console.log(`Example app listening at http://localhost:${port}`);
});
