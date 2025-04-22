const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store active rooms
const rooms = {};

// Route for creating a new room
app.get('/create-room', (req, res) => {
  const roomId = uuidv4();
  rooms[roomId] = { users: [] };
  res.json({ roomId });
});

// Route for checking if a room exists
app.get('/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  if (rooms[roomId]) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).send('Room not found');
  }
});

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle room joining
  socket.on('join-room', (roomId, userId, username) => {
    console.log(`User ${username} (${userId}) joined room ${roomId}`);
    
    // Join the room
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = { users: [] };
    }
    
    // Add user to the room
    rooms[roomId].users.push({
      id: userId,
      username: username,
      socketId: socket.id
    });
    
    // Tell other users that a new user has joined
    socket.to(roomId).emit('user-connected', userId, username);
    
    // Send list of existing users to the new user
    socket.emit('existing-users', rooms[roomId].users.filter(user => user.id !== userId));
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${username} disconnected from room ${roomId}`);
      
      // Remove user from the room
      if (rooms[roomId]) {
        rooms[roomId].users = rooms[roomId].users.filter(user => user.socketId !== socket.id);
        
        // Delete room if empty
        if (rooms[roomId].users.length === 0) {
          delete rooms[roomId];
        } else {
          // Notify others that user has left
          socket.to(roomId).emit('user-disconnected', userId, username);
        }
      }
    });
  });

  // Handle WebRTC signaling
  socket.on('signal', ({ userId, to, signal }) => {
    io.to(to).emit('signal', { userId, from: socket.id, signal });
  });

  // Handle chat messages
  socket.on('send-message', (roomId, message, username) => {
    io.to(roomId).emit('receive-message', {
      content: message,
      sender: username,
      timestamp: new Date().toISOString()
    });
  });

  // Handle audio/video toggle events for notification purposes
  socket.on('toggle-media', (roomId, userId, type, enabled) => {
    socket.to(roomId).emit('user-toggle-media', userId, type, enabled);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
