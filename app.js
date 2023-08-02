require('dotenv').config()
const bodyParser = require("body-parser");
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const BACKEND_SECRET = "super_duper_secret_here";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors({
  origin: "*"
}));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  next();
});

app.get("/", (req, res) => {
  res.send(``);
});

const throwUnauthorized = res => {
  res.status(401);
  res.send("Unauthorized");
}

app.post("/backendnotify", async (req, res) => {
  let showUnauthorized = true;
  // need to check if the body contains socketid && secret to verifiy this is our php backend
  if ((req?.body?.secret ?? false) === false || (req?.body?.socketid ?? false) === false) { 
    throwUnauthorized(res)
    return;
  }
  if (req?.body?.secret === BACKEND_SECRET) {
    if (req?.body?.socketid ?? false) {
      io.to(req?.body?.socketid).emit("check_login_state");
    }
  } else {
    throwUnauthorized(res)
    return;
  }
  res.status(200);
  res.send("ok");
});

app.post("/clients", async (req, res) => {
  const sockets = await io.of("/").fetchSockets();
  var rs = sockets.map((sock) => {
    return {
      socket_id: sock.id,
      socket_data: sock.data,
    };
  });
  res.setHeader("Content-Type", "application/json");
  res.send(`{"status":"ok", "data": ${JSON.stringify(rs)}}`);
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {});

io.on("connection", (socket) => {
  socket.data.connect_time = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/, "");
  console.log("connected: ", {
    id: socket.id,
    phpsessid: socket?.handshake?.query["phpsessid"]
  });

  socket.on("disconnect", () => {
    console.log("Socket Disconnected")
  });

  if (typeof socket?.handshake?.query["phpsessid"] === "undefined") {
    console.log("Socket Disconnected for not providing phpsessid")
    socket.disconnect();
  }
});

httpServer.listen(process.env.PORT, () => {
  console.log("listening on port " + process.env.PORT);
});
