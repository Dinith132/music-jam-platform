const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(express.static("public")); // Serve frontend files from 'public' folder

// Store active rooms and their participants
const rooms = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // When a user joins a room
  socket.on("join-room", (roomId, username) => {
    console.log(`User ${socket.id} attempting to join room ${roomId}`);

    // Create the room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    // Add user to the room
    socket.join(roomId);
    rooms[roomId].push({
      id: socket.id,
      username: username || "Guest",
    });

    // Notify others in the room
    socket.to(roomId).emit("user-connected", socket.id, username);

    // Send the list of existing users to the new participant
    socket.emit(
      "room-users",
      rooms[roomId].filter((user) => user.id !== socket.id)
    );

    console.log(`User ${socket.id} joined room ${roomId}`);

    // Handle chat messages
    socket.on("send-message", (message) => {
      io.to(roomId).emit("receive-message", {
        user: username || "Guest",
        text: message,
        senderId: socket.id,
      });
    });

    // Handle WebRTC signaling
    socket.on("offer", (offer, targetId) => {
      console.log(`Forwarding offer from ${socket.id} to ${targetId}`);
      socket.to(targetId).emit("offer", offer, socket.id);
    });

    socket.on("answer", (answer, targetId) => {
      console.log(`Forwarding answer from ${socket.id} to ${targetId}`);
      socket.to(targetId).emit("answer", answer, socket.id);
    });

    socket.on("ice-candidate", (candidate, targetId) => {
      console.log(`Forwarding ICE candidate from ${socket.id} to ${targetId}`);
      socket.to(targetId).emit("ice-candidate", candidate, socket.id);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User ${socket.id} left room ${roomId}`);

      // Remove user from room
      if (rooms[roomId]) {
        // Find the user's username before removing them
        const user = rooms[roomId].find((u) => u.id === socket.id);
        const username = user ? user.username : "Guest";

        rooms[roomId] = rooms[roomId].filter((user) => user.id !== socket.id);

        // Delete room if empty
        if (rooms[roomId].length === 0) {
          delete rooms[roomId];
        } else {
          // Notify others that user disconnected with their username
          socket.to(roomId).emit("user-disconnected", socket.id, username);
        }
      }
    });
  });
});

// Error handling for the server
server.on("error", (error) => {
  console.error("Server error:", error);
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
