const express = require("express");
const path = require("path");
const indexRouter = require("./routes/index");
const machinesRouter = require("./routes/machines");
const suppliesRouter = require("./routes/supply");

const app = express();
const port = 3000;
app.use(express.json());
app.use(
    express.urlencoded({
        extended: true,
    })
);

app.use(express.static(path.join(__dirname, 'public')));


app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use('/', indexRouter);
app.use('/', suppliesRouter);
app.use('/machines', machinesRouter);

//app.get("/", (req, res) => {
  //  res.json({ message: "ok" });
//});

app.listen(port, () => {
 console.log(`Example app listening at http://localhost:${port}`);
});
