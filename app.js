const express = require("express");
const indexRouter = require("./routes/index");
const path = require("path");
const machinesRouter = require("./routes/machines")

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

app.use('/', indexRouter);
app.use('/machines', machinesRouter);

//app.get("/", (req, res) => {
  //  res.json({ message: "ok" });
//});

app.listen(port, () => {
 console.log(`Example app listening at http://localhost:${port}`);
});