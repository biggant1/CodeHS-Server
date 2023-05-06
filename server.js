const express = require("express");
const app = express();
const cors = require("cors");
const WebSocket = require("ws");
const RoomsManager = require("./RoomsManager");
const DatabaseManager = require("./DatabaseManager");

const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });
const rm = new RoomsManager();

const port = process.env.PORT || 8080;
app.use(cors());
app.use(express.json());

wss.on("connection", (socket) => {
  console.log("New connection");
  socket.on("message", (data) => {
    let [event, message] = JSON.parse(data);
    console.log(event, message);

    if (event === "join chat") {
      let room_id = message;
      socket.room_id = room_id;
      rm.join(socket, room_id);
    } else if (event === "msg") {
      rm.emit(socket.room_id, message, socket);
    } else if (event === "leave") {
      if (!socket.room_id) return;
      rm.leave(socket, socket.room_id);
      socket.room_id = undefined;
    }
  });

  socket.on("close", () => {
    if (!socket.room_id) return;
    rm.leave(socket, socket.room_id);
    socket.room_id = undefined;
  });
});

app.post("/rooms", async (req, res) => {
  let room_name = req.body.room_name;
  let room = await DatabaseManager.createRoom({ room_name });
  res.send(room);
});

app.post("/:roomid/messages", async (req, res) => {
  let message = req.body.content;
  let roomid = req.params.roomid;
  DatabaseManager.addMessage();
});

server.listen(port, () => console.log(`Running on http://localhost:${port}/`));