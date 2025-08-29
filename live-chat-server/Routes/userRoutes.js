const express = require("express");
const {
  loginController,
  registerController,
  fetchAllUsersController,
  blockUserController,
  unblockUserController,
  getBlockedUsersController,
} = require("../Controllers/userController");

const { protect } = require("../middleware/authMiddleware");

const Router = express.Router();

Router.post("/login", loginController);
Router.post("/register", registerController);
Router.get("/fetchUsers", protect, fetchAllUsersController);
Router.post("/block", protect, blockUserController);
Router.post("/unblock", protect, unblockUserController);
Router.get("/blocked", protect, getBlockedUsersController);

module.exports = Router;
