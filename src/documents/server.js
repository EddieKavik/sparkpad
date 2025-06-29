const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const documents = {};
const documentTitles = {};

io.on('connection', (socket) => {
  socket.on('document:join', ({ documentId }) => {
    socket.join(documentId);
    socket.emit('document:update', { content: documents[documentId] || '' });
    socket.emit('title:update', { title: documentTitles[documentId] || '' });
  });
  socket.on('document:edit', ({ documentId, content }) => {
    documents[documentId] = content;
    socket.to(documentId).emit('document:update', { content });
  });
  // Row-level real-time sync
  socket.on('row:edit', ({ documentId, rowIdx, value }) => {
    if (!documents[documentId]) documents[documentId] = [];
    documents[documentId][rowIdx] = value;
    socket.to(documentId).emit('row:update', { rowIdx, value });
  });
  // Row add real-time sync
  socket.on('row:add', ({ documentId, value }) => {
    if (!documents[documentId]) documents[documentId] = [];
    documents[documentId].push(value);
    const rowIdx = documents[documentId].length - 1;
    io.to(documentId).emit('row:added', { rowIdx, value });
  });
  // Title-level real-time sync
  socket.on('title:edit', ({ documentId, title }) => {
    documentTitles[documentId] = title;
    socket.to(documentId).emit('title:update', { title });
  });
  // Document add real-time sync
  socket.on('document:add', ({ doc }) => {
    io.emit('document:added', { doc });
  });
  // Document rename real-time sync
  socket.on('document:rename', ({ doc }) => {
    io.emit('document:renamed', { doc });
  });
  // Document delete real-time sync
  socket.on('document:delete', ({ docId }) => {
    io.emit('document:deleted', { docId });
  });
  // User typing presence
  socket.on('user:typing', ({ documentId, rowIdx, user }) => {
    socket.to(documentId).emit('user:typing', { rowIdx, user });
  });
  socket.on('user:stopTyping', ({ documentId, rowIdx, user }) => {
    socket.to(documentId).emit('user:stopTyping', { rowIdx, user });
  });
});

server.listen(4000, () => {
  console.log('Server listening on http://localhost:4000');
}); 