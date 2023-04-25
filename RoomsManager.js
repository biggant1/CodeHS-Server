const WebSocket = require("ws");

class RoomsManager {
  rooms = {};

  __createRoom(roomid) {
    this.rooms[roomid] = [];
  }

  emit(roomid, data, ws = "null") {
    if (!this.rooms[roomid]) return;
    this.rooms[roomid].forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN && ws !== socket) {
        socket.send(data);
      }
    });
  }

  join(socket, roomid) {
    if (!this.rooms.hasOwnProperty(roomid)) this.__createRoom(roomid);
    if (this.rooms[roomid].includes(socket)) return;
    this.rooms[roomid].push(socket);
  }

  leave(socket, roomid) {
    if (!this.rooms[roomid]) return;
    this.rooms[roomid].forEach((ws, i) => {
      if (socket === ws) {
        this.rooms[roomid].splice(i, 1);
      }
    });
    if (this.rooms[roomid].length === 0) delete this.rooms[roomid];
  }
}

module.exports = RoomsManager;
