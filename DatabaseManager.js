const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: "./data.sqlite",
  },
  useNullAsDefault: true,
});
const uuid = require("short-uuid");

// async function createTable() {
//   // await knex.schema.createTable("rooms", (table) => {
//   //   table.string("id").primary();
//   //   table.string("room_name");
//   // });
//   await knex.schema.createTable("messages", (table) => {
//     table.string("id").primary();
//     table.string("room_id").notNullable();
//     table.foreign("room_id").references("id").inTable("rooms");
//     table.string("author");
//     table.string("content");
//     table.timestamp("created_at");
//   });
// }

async function createRoom({ room_name }) {
  const room = await knex("rooms").insert({
    id: uuid.generate(),
    room_name: room_name,
  });
  console.log(room);
  return room;
}

async function addMessage({ author, content, room_id }) {
  await knex("messages").insert({
    id: uuid.generate(),
    author: author,
    content: content,
    room_id: room_id,
    created_at: knex.fn.now(6),
  });
}

module.exports = { createRoom, addMessage };
