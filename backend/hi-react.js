const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require('body-parser')
const fileUpload = require('express-fileupload')////
const { v4: uuidv4 } = require('uuid');
const uuid = uuidv4();
require('dotenv').config()
const cors = require('cors');
const helper = require('./helpers/helper');

const buildPath = path.join(__dirname, "../frontend/dist")
const app = express();

const http = require("http").Server(app);
const PORT = process.env.PORT

const { Server } = require("socket.io");
const io = new Server(http, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
app.set("io", io);
io.on("connection", (socket) => {
  socket.on("join_admin", () => {
    socket.join("admin_panel");
  });
});

const db = require('./models');
require('./models/associations')(db);

const AdminRouter = require('./routes/route_admin');
const apisRouter = require('./routes/apis');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static(buildPath));

app.use(fileUpload());////

app.use('/admin', AdminRouter);
app.use('/mobile', apisRouter(io));
require('./socket/socket')(io);
require('./helpers/cronJobs')();
app.get("*", async (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
})
// catch 404 and forward to error handler           
app.use(function (req, res, next) {
  next(createError(404));
});

http.listen(PORT, (req, res) => {
  console.log(`Your server start with port ${PORT}`);
})




