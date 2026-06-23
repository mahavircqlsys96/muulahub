const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();
const cors = require('cors');

const buildPath = path.join(__dirname, "../frontend/dist");

const app = express();

/*
=========================================
HTTP SERVER + SOCKET.IO SETUP
=========================================
*/
const http = require("http").Server(app);

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

/*
=========================================
DATABASE + MODELS
=========================================
*/
const db = require('./models');
require('./models/associations')(db);

/*
=========================================
ROUTES
=========================================
*/
const AdminRouter = require('./routes/route_admin');
const apisRouter = require('./routes/apis');

/*
=========================================
VIEW ENGINE
=========================================
*/
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

/*
=========================================
MIDDLEWARES
=========================================
*/
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(buildPath));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload());

/*
=========================================
ROUTES MOUNT
=========================================
*/
app.use('/admin', AdminRouter);
app.use('/mobile', apisRouter(io));

require('./socket/socket')(io);

/*
=========================================
FRONTEND FALLBACK ROUTE
=========================================
*/
app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

/*
=========================================
404 HANDLER
=========================================
*/
app.use((req, res, next) => {
  next(createError(404));
});

/*
=========================================
PORT CONFIG FIX (IMPORTANT)
=========================================
*/
const PORT = process.env.PORT || 3000;

/*
=========================================
START SERVER (IMPORTANT FIX)
=========================================
*/
http.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});