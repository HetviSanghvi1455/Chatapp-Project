<<<<<<< HEAD
const express = require("express");
const dotenv = require("dotenv");
const { default: mongoose } = require("mongoose");
const app = express();
const cors = require("cors");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

app.use(
  cors({
    origin: "*",
  })
);
dotenv.config();

app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const userRoutes = require("./Routes/userRoutes");
const chatRoutes = require("./Routes/chatRoutes");
const messageRoutes = require("./Routes/messageRoutes");

const connectDb = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URI);
    console.log("Server is Connected to Database");
  } catch (err) {
    console.log("Server is NOT connected to Database", err.message);
  }
};
connectDb();

app.get("/", (req, res) => {
  res.send("API is running123");
});

app.use("/user", userRoutes);
app.use("/chat", chatRoutes);
app.use("/message", messageRoutes);

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, console.log("Server is Running..."));

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store user socket mappings
const userSockets = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join user to their personal room
  socket.on("join:user", (userId) => {
    socket.join(`user:${userId}`);
    userSockets.set(userId, socket.id);
    console.log(`User ${userId} joined room: user:${userId}`);
  });

  // Handle new chat creation
  socket.on("new:chat", (chat) => {
    // Broadcast to all users in the chat
    for (const userId of chat.users) {
      socket.to(`user:${userId}`).emit("notification:new_chat", chat);
    }
  });

  socket.on("disconnect", () => {
    // Remove user from socket mapping
    for (let [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
    console.log("User disconnected:", socket.id);
  });
});

// Make io available to other modules
app.set("io", io);
=======
const express = require("express");
const dotenv = require("dotenv");
const { default: mongoose } = require("mongoose");
const app = express();
const cors = require("cors");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

app.use(
  cors({
    origin: "*",
  })
);
dotenv.config();

app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const userRoutes = require("./Routes/userRoutes");
const chatRoutes = require("./Routes/chatRoutes");
const messageRoutes = require("./Routes/messageRoutes");

const connectDb = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URI);
    console.log("Server is Connected to Database");
  } catch (err) {
    console.log("Server is NOT connected to Database", err.message);
  }
};
connectDb();

app.get("/", (req, res) => {
  res.send("API is running123");
});

app.use("/user", userRoutes);
app.use("/chat", chatRoutes);
app.use("/message", messageRoutes);

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, console.log("Server is Running..."));

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store user socket mappings
const userSockets = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join user to their personal room
  socket.on("join:user", (userId) => {
    socket.join(`user:${userId}`);
    userSockets.set(userId, socket.id);
    console.log(`User ${userId} joined room: user:${userId}`);
  });

  // Handle new chat creation
  socket.on("new:chat", (chat) => {
    // Broadcast to all users in the chat
    for (const userId of chat.users) {
      socket.to(`user:${userId}`).emit("notification:new_chat", chat);
    }
  });

  socket.on("disconnect", () => {
    // Remove user from socket mapping
    for (let [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
    console.log("User disconnected:", socket.id);
  });
});

// Make io available to other modules
app.set("io", io);
>>>>>>> 594d3b6b06fb7016060d793786bbccb77db42e0d
