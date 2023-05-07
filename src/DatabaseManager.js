const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: "./db.sqlite",
  },
  useNullAsDefault: true,
});
const uuid = require("short-uuid");
const CryptoManager = require("./CryptoManager");

async function createTable() {
  // await knex.schema.createTable("rooms", (table) => {
  //   table.string("id").primary();
  //   table.string("room_name");
  // });
  // await knex.schema.createTable("messages", (table) => {
  //   table.string("id").primary();
  //   table.string("room_id").notNullable();
  //   table.foreign("room_id").references("id").inTable("rooms");
  //   table.string("author_id");
  //   table.foreign("author_id").references("id").inTable("authors");
  //   table.string("content");
  //   table.timestamp("created_at");
  // });
  // await knex.schema.createTable("authors", (table) => {
  //   table.string("id").primary();
  //   table.string("display_name");
  //   table.string("email");
  //   table.string("password_hash");
  //   table.string("salt");
  // });
}

async function createRoom({ room_name }) {
  const room = await knex("rooms")
    .insert({
      id: uuid.generate(),
      room_name: room_name,
    })
    .returning("*");
  return room;
}

async function addMessage({ author_id, content, room_id }) {
  let message_id = await knex("messages")
    .insert({
      id: uuid.generate(),
      author_id: author_id,
      content: content,
      room_id: room_id,
      created_at: Date.now(),
    })
    .returning("id");
  let message = await knex("messages")
    .where("messages.id", message_id[0].id)
    .join("authors", "messages.author_id", "authors.id")
    .select(
      "authors.display_name",
      "authors.id as author_id",
      "messages.id as message_id",
      "content",
      "created_at"
    );
  return message[0];
}

async function createAuthor({ display_name, email, password }) {
  let [salt, password_hash] = CryptoManager.generatePasswordHash(password);
  let author = await knex("authors")
    .insert({
      id: uuid.generate(),
      display_name: display_name,
      email: email,
      salt: salt,
      password_hash: password_hash,
    })
    .returning("id", "display_name", "email");
  return author[0];
}

async function getMessages(room_id, limit = 100, offset = 0) {
  let messages = await knex("messages")
    .where("room_id", room_id)
    .join("authors", "messages.author_id", "authors.id")
    .select(
      "authors.display_name",
      "authors.id as author_id",
      "messages.id as message_id",
      "content",
      "created_at"
    )
    .limit(limit)
    .offset(offset)
    .orderBy("created_at", "desc");

  return messages;
}

async function getAuthorById(author_id) {
  let author = await knex("authors").select("*").where("id", author_id);
  return author?.[0];
}

async function getAuthorByEmail(email) {
  let author = await knex("authors").select("*").where("email", email);
  return author?.[0];
}

async function deleteMessageById(message_id) {
  await knex("messages").where("id", message_id).del();
  return { message_id };
}

async function getRooms(limit = 100) {
  let rooms = await knex("rooms").select("*").limit(limit);
  return rooms;
}

module.exports = {
  createRoom,
  addMessage,
  getMessages,
  createAuthor,
  getAuthorById,
  getAuthorByEmail,
  deleteMessageById,
  getRooms,
  knex,
};
