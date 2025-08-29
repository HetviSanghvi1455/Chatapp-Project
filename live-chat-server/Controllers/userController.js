<<<<<<< HEAD
const generateToken = require("../Config/generateToken");
const UserModel = require("../modals/userModel");
const expressAsyncHandler = require("express-async-handler");
// Login
const loginController = expressAsyncHandler(async (req, res) => {
  console.log(req.body);
  const { name, password } = req.body;

  const user = await UserModel.findOne({ name });

  console.log("fetched user Data", user);
  console.log(await user.matchPassword(password));
  if (user && (await user.matchPassword(password))) {
    const response = {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    };
    console.log(response);
    res.json(response);
  } else {
    res.status(401);
    throw new Error("Invalid UserName or Password");
  }
});

// Registration
const registerController = expressAsyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // check for all fields
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("All necessary input fields have not been filled");
  }

  // pre-existing user
  const userExist = await UserModel.findOne({ email });
  if (userExist) {
    res.status(409);
    throw new Error("User with this email already exists");
  }

  // userName already Taken
  const userNameExist = await UserModel.findOne({ name });
  if (userNameExist) {
    res.status(409);
    throw new Error("Username already taken");
  }

  // create an entry in the db
  const user = await UserModel.create({ name, email, password });
  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Registration Error");
  }
});

const fetchAllUsersController = expressAsyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  // Get current user's blocked users
  const currentUser = await UserModel.findById(req.user._id);
  const blockedUserIds = currentUser.blockedUsers || [];
  
  console.log("Fetching users - Current user:", req.user._id);
  console.log("Blocked user IDs:", blockedUserIds);

  const users = await UserModel.find(keyword).find({
    _id: { $ne: req.user._id },
    _id: { $nin: blockedUserIds }, // Exclude blocked users
  });
  
  console.log("Found users:", users.length);
  res.send(users);
});

const blockUserController = expressAsyncHandler(async (req, res) => {
  const { userId } = req.body;
  
  console.log("Block user request:", { userId, currentUser: req.user._id });
  
  if (!userId) {
    res.status(400);
    throw new Error("User ID is required");
  }

  try {
    // Add user to blocked list
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { blockedUsers: userId } },
      { new: true }
    );

    console.log("Updated user after blocking:", updatedUser);

    if (!updatedUser) {
      res.status(404);
      throw new Error("User not found");
    }

    // Emit socket event to notify both users about the block
    const io = req.app.get("io");
    if (io) {
      console.log("Emitting block events");
      // Notify the user who was blocked
      io.to(`user:${userId}`).emit("user:blocked", { 
        blockedBy: req.user._id,
        message: "You have been blocked by another user"
      });
      
      // Notify the user who did the blocking
      io.to(`user:${req.user._id}`).emit("user:blocked", { 
        blockedUser: userId,
        message: "User blocked successfully"
      });
    }

    res.status(200).json({ message: "User blocked successfully", blockedUsers: updatedUser.blockedUsers });
  } catch (error) {
    console.error("Error in blockUserController:", error);
    res.status(400);
    throw new Error(error.message);
  }
});

const unblockUserController = expressAsyncHandler(async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    res.status(400);
    throw new Error("User ID is required");
  }

  try {
    // Remove user from blocked list
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user._id,
      { $pull: { blockedUsers: userId } },
      { new: true }
    );

    if (!updatedUser) {
      res.status(404);
      throw new Error("User not found");
    }

    // Emit socket event to notify both users about the unblock
    const io = req.app.get("io");
    if (io) {
      // Notify the user who was unblocked
      io.to(`user:${userId}`).emit("user:unblocked", { 
        unblockedBy: req.user._id,
        message: "You have been unblocked by another user"
      });
      
      // Notify the user who did the unblocking
      io.to(`user:${req.user._id}`).emit("user:unblocked", { 
        unblockedUser: userId,
        message: "User unblocked successfully"
      });
    }

    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const getBlockedUsersController = expressAsyncHandler(async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).populate('blockedUsers', 'name email');
    res.status(200).json(user.blockedUsers || []);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = {
  loginController,
  registerController,
  fetchAllUsersController,
  blockUserController,
  unblockUserController,
  getBlockedUsersController,
};
=======
const generateToken = require("../Config/generateToken");
const UserModel = require("../modals/userModel");
const expressAsyncHandler = require("express-async-handler");
// Login
const loginController = expressAsyncHandler(async (req, res) => {
  console.log(req.body);
  const { name, password } = req.body;

  const user = await UserModel.findOne({ name });

  console.log("fetched user Data", user);
  console.log(await user.matchPassword(password));
  if (user && (await user.matchPassword(password))) {
    const response = {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    };
    console.log(response);
    res.json(response);
  } else {
    res.status(401);
    throw new Error("Invalid UserName or Password");
  }
});

// Registration
const registerController = expressAsyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // check for all fields
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("All necessary input fields have not been filled");
  }

  // pre-existing user
  const userExist = await UserModel.findOne({ email });
  if (userExist) {
    res.status(409);
    throw new Error("User with this email already exists");
  }

  // userName already Taken
  const userNameExist = await UserModel.findOne({ name });
  if (userNameExist) {
    res.status(409);
    throw new Error("Username already taken");
  }

  // create an entry in the db
  const user = await UserModel.create({ name, email, password });
  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Registration Error");
  }
});

const fetchAllUsersController = expressAsyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  // Get current user's blocked users
  const currentUser = await UserModel.findById(req.user._id);
  const blockedUserIds = currentUser.blockedUsers || [];
  
  console.log("Fetching users - Current user:", req.user._id);
  console.log("Blocked user IDs:", blockedUserIds);

  const users = await UserModel.find(keyword).find({
    _id: { $ne: req.user._id },
    _id: { $nin: blockedUserIds }, // Exclude blocked users
  });
  
  console.log("Found users:", users.length);
  res.send(users);
});

const blockUserController = expressAsyncHandler(async (req, res) => {
  const { userId } = req.body;
  
  console.log("Block user request:", { userId, currentUser: req.user._id });
  
  if (!userId) {
    res.status(400);
    throw new Error("User ID is required");
  }

  try {
    // Add user to blocked list
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { blockedUsers: userId } },
      { new: true }
    );

    console.log("Updated user after blocking:", updatedUser);

    if (!updatedUser) {
      res.status(404);
      throw new Error("User not found");
    }

    // Emit socket event to notify both users about the block
    const io = req.app.get("io");
    if (io) {
      console.log("Emitting block events");
      // Notify the user who was blocked
      io.to(`user:${userId}`).emit("user:blocked", { 
        blockedBy: req.user._id,
        message: "You have been blocked by another user"
      });
      
      // Notify the user who did the blocking
      io.to(`user:${req.user._id}`).emit("user:blocked", { 
        blockedUser: userId,
        message: "User blocked successfully"
      });
    }

    res.status(200).json({ message: "User blocked successfully", blockedUsers: updatedUser.blockedUsers });
  } catch (error) {
    console.error("Error in blockUserController:", error);
    res.status(400);
    throw new Error(error.message);
  }
});

const unblockUserController = expressAsyncHandler(async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    res.status(400);
    throw new Error("User ID is required");
  }

  try {
    // Remove user from blocked list
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user._id,
      { $pull: { blockedUsers: userId } },
      { new: true }
    );

    if (!updatedUser) {
      res.status(404);
      throw new Error("User not found");
    }

    // Emit socket event to notify both users about the unblock
    const io = req.app.get("io");
    if (io) {
      // Notify the user who was unblocked
      io.to(`user:${userId}`).emit("user:unblocked", { 
        unblockedBy: req.user._id,
        message: "You have been unblocked by another user"
      });
      
      // Notify the user who did the unblocking
      io.to(`user:${req.user._id}`).emit("user:unblocked", { 
        unblockedUser: userId,
        message: "User unblocked successfully"
      });
    }

    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const getBlockedUsersController = expressAsyncHandler(async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).populate('blockedUsers', 'name email');
    res.status(200).json(user.blockedUsers || []);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = {
  loginController,
  registerController,
  fetchAllUsersController,
  blockUserController,
  unblockUserController,
  getBlockedUsersController,
};
>>>>>>> 594d3b6b06fb7016060d793786bbccb77db42e0d
