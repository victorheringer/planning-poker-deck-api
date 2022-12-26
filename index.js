require("dotenv").config();

const io = require("socket.io")(process.env.PORT, {
  cors: { origin: "*" },
  methods: ["GET", "POST"],
});

const ACTIONS = {
  JOIN_ROOM: "JOIN_ROOM",
  REMOVE_DISCONNECTED_CLIENT: "REMOVE_DISCONNECTED_CLIENT",
  DISCONNECT_CLIENTS_FROM_HOST: "DISCONNECT_CLIENTS_FROM_HOST",
  HOST: "HOST_ACTION",
  CLIENT: "CLIENTS_ACTION",
  CLIENT_JOIN_GAME: "CLIENT_JOIN_GAME",
  CALL_HOST: "CALL_HOST_ACTION",
  CALL_CLIENT: "CALL_CLIENTS_ACTION",
  HOST_CONNECTED: "HOST_CONNECTED",
};

const IO_EVENTS = {
  DISCONNECT: "disconnecting",
  CONNECT: "connection",
};

function getHostRoom(room) {
  return `host/${room}`;
}

function getClientRoom(room) {
  return `client/${room};`;
}

function getAllRooms(room) {
  return { hostRoom: getHostRoom(room), clientRoom: getClientRoom(room) };
}

function getInitClientState(id, playerName, socketId) {
  return {
    clientState: { id, playerName, card: null, online: true, socketId },
  };
}

io.on(IO_EVENTS.CONNECT, (socket) => {
  socket.on(ACTIONS.JOIN_ROOM, ({ owner, room, id, playerName }) => {
    const { hostRoom, clientRoom } = getAllRooms(room);

    function joinHost() {
      socket.join(hostRoom);

      io.to(clientRoom).emit(ACTIONS.CLIENT, {
        type: ACTIONS.HOST_CONNECTED,
      });

      socket.on(IO_EVENTS.DISCONNECT, () => {
        io.to(clientRoom).emit(ACTIONS.CLIENT, {
          type: ACTIONS.DISCONNECT_CLIENTS_FROM_HOST,
        });
      });
    }

    function joinClient() {
      socket.join(clientRoom);

      socket.broadcast.to(hostRoom).emit(ACTIONS.HOST, {
        type: ACTIONS.CLIENT_JOIN_GAME,
        payload: getInitClientState(id, playerName, socket.id),
      });

      socket.on(IO_EVENTS.DISCONNECT, () => {
        io.to(hostRoom).emit(ACTIONS.HOST, {
          type: ACTIONS.REMOVE_DISCONNECTED_CLIENT,
          payload: { socketId: socket.id },
        });
      });
    }

    owner ? joinHost() : joinClient();
  });

  socket.on(ACTIONS.CALL_HOST, (action) => {
    io.to(getHostRoom(action.payload.room)).emit(ACTIONS.HOST, action);
  });

  socket.on(ACTIONS.CALL_CLIENT, (action) => {
    io.to(getClientRoom(action.payload.room)).emit(ACTIONS.CLIENT, action);
  });
});

console.log("Running planning poker server");
