<<<<<<< HEAD
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
=======
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
>>>>>>> 594d3b6b06fb7016060d793786bbccb77db42e0d
