const { Server } = require("socket.io");

const io = new Server(3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

console.log("Socket.io server listening on port 3001");

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.on('project:join', (projectId) => {
    socket.join(projectId);
    console.log(`Socket ${socket.id} joined project ${projectId}`);
  });

  socket.on('project:leave', (projectId) => {
    socket.leave(projectId);
    console.log(`Socket ${socket.id} left project ${projectId}`);
  });

  // --- Document Events ---
  socket.on('document:create', (data) => {
    socket.to(data.projectId).emit('document:created', {});
  });

  socket.on('document:rename', (data) => {
    io.to(data.projectId).emit('document:renamed', {
      docId: data.docId,
      newTitle: data.newTitle,
      newTags: data.newTags,
    });
  });

  socket.on('document:delete', (data) => {
    io.to(data.projectId).emit('document:deleted', data.docId);
  });

  // --- Row Events ---
  socket.on('row:add', (data) => {
    io.to(data.projectId).emit('row:added', {
      docId: data.docId,
      newRow: data.newRow,
    });
  });

  socket.on('row:update', (data) => {
    io.to(data.projectId).emit('row:updated', {
      docId: data.docId,
      rowIdx: data.rowIdx,
      updatedRow: data.updatedRow,
    });
  });

  socket.on('row:delete', (data) => {
    io.to(data.projectId).emit('row:deleted', {
      docId: data.docId,
      rowIdx: data.rowIdx,
    });
  });

  socket.on('cursor:update', (data) => {
    socket.to(data.projectId).emit('cursor:update', data);
  });

  socket.on('cursor:leave', (data) => {
    socket.to(data.projectId).emit('cursor:left', { userId: data.userId });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
  });
}); 