const express = require("express");
const app = express();
const cors = require("cors");
const WebSocket = require("ws");
const RoomsManager = require("./RoomsManager");
const DatabaseManager = require("./DatabaseManager");
const CryptoManager = require("./CryptoManager");

const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });
const rm = new RoomsManager();

const port = process.env.PORT || 8080;
app.use(cors());
app.use(express.json());

wss.on("connection", (socket) => {
  socket.on("message", (data) => {
    let [event, message] = JSON.parse(data);
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

app.get("/rooms", async (req, res) => {
  let rooms = await DatabaseManager.getRooms();
  res.json(rooms);
});

app.post("/rooms", async (req, res) => {
  let room_name = req.body.room_name;
  let room = await DatabaseManager.createRoom({ room_name });
  res.json(room[0]);
});

app.post("/rooms/:roomid/messages", async (req, res) => {
  let { content, author_id, encrypted_password } = req.body;
  let room_id = req.params.roomid;

  if (!content || !author_id || !room_id)
    return res.status(400).send("Missing a required parameter");

  let password = CryptoManager.decryptPassword(encrypted_password);
  if (password === "Invalid encryption")
    return res.status(400).send("Password encryption is invalid");

  let author = await DatabaseManager.getAuthorById(author_id);
  if (!author) return res.status(400).send("Invalid author id");

  if (!CryptoManager.checkIfValid(password, author.salt, author.password_hash))
    return res.status(401).send("Invalid password!");

  let message = await DatabaseManager.addMessage({
    author_id,
    content,
    room_id,
  });
  rm.emit(room_id, JSON.stringify({ event: "message", content: message }));

  res.send("Successfully sent message!");
});

app.delete("/rooms/:roomid/messages/:messageid", async (req, res) => {
  let { encrypted_password } = req.body;
  let room_id = req.params.roomid;
  let message_id = req.params.messageid;
  if (!message_id || !room_id || !encrypted_password)
    return res.status(400).send("Missing a required parameter");

  let msgAndAuthor = await DatabaseManager.knex("messages")
    .where({
      room_id: room_id,
      "messages.id": message_id,
    })
    .join("authors", "messages.author_id", "authors.id")
    .select("messages.id", "authors.password_hash", "authors.salt");
  msgAndAuthor = msgAndAuthor?.[0];
  if (!msgAndAuthor)
    return res
      .status(404)
      .send(`Message with id ${message_id} in room ${room_id} cannot be found`);

  let password = CryptoManager.decryptPassword(encrypted_password);
  if (password === "Invalid encryption") {
    return res.status(400).send("Password encryption is invalid");
  }

  if (
    !CryptoManager.checkIfValid(
      password,
      msgAndAuthor.salt,
      msgAndAuthor.password_hash
    )
  )
    return res.status(401).send("Invalid password!");

  let message = await DatabaseManager.deleteMessageById(msgAndAuthor.id);
  rm.emit(room_id, JSON.stringify({ event: "delete", content: message }));

  res.send("Successfully deleted message!");
});

app.post("/authors", async (req, res) => {
  let { display_name, email, encrypted_password } = req.body;
  if (!display_name || !email || !encrypted_password)
    return res.status(400).send("Missing a required parameter");
  let password = CryptoManager.decryptPassword(encrypted_password);
  if (password === "Invalid encryption") {
    return res.status(400).send("Password encryption is invalid");
  }

  let author = await DatabaseManager.createAuthor({
    display_name,
    email,
    password,
  });
  res.json(author);
});

app.post("/authors/login", async (req, res) => {
  let { email, encrypted_password } = req.body;
  if (!email || !encrypted_password)
    return res.status(400).json("Missing a required parameter");
  let author = await DatabaseManager.getAuthorByEmail(email);
  if (!author) return res.status(400).json(`No author with email ${email}`);
  let password = CryptoManager.decryptPassword(encrypted_password);
  if (password === "Invalid encryption") {
    return res.status(400).json("Password encryption is invalid");
  }

  if (!CryptoManager.checkIfValid(password, author.salt, author.password_hash))
    return res.status(401).json("Incorrect password!");

  delete author["password_hash"];
  delete author["salt"];
  res.json(author);
});

app.get("/rooms/:roomid/messages", async (req, res) => {
  let room_id = req.params.roomid;
  let { limit, offset } = req.query;
  if (!room_id) return res.status(400).send("Missing a required parameter");

  messages = await DatabaseManager.getMessages(room_id, limit, offset);
  res.json(messages);
});

app.get("/publickey", async (req, res) => {
  return res.send(CryptoManager.public_key);
});

server.listen(port, () => console.log(`Running on http://localhost:${port}/`));
