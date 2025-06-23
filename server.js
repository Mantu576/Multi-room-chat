const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// In-memory user/room state
const users = {};
const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('joinRoom', ({ nickname, room }) => {
    socket.join(room);
    users[socket.id] = { nickname, room };

    if (!rooms[room]) rooms[room] = [];
    rooms[room].push(nickname);

    // Notify others
    socket.to(room).emit('systemMessage', `${nickname} has joined the room.`);
    io.to(room).emit('userList', rooms[room]);
  });

  socket.on('chatMessage', (message) => {
    const user = users[socket.id];
    if (user) {
      const timestamp = new Date().toLocaleTimeString();
      io.to(user.room).emit('chatMessage', {
        nickname: user.nickname,
        message,
        timestamp,
      });
    }
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      const { nickname, room } = user;
      rooms[room] = rooms[room].filter((n) => n !== nickname);
      socket.to(room).emit('systemMessage', `${nickname} has left the room.`);
      io.to(room).emit('userList', rooms[room]);
      delete users[socket.id];
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
