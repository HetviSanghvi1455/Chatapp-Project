<<<<<<< HEAD
const express = require("express");
const {
  allMessages,
  sendMessage,
  sendFileMessage,
  deleteMessage,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.route("/file").post(protect, upload.single('file'), sendFileMessage);
router.route("/delete/:messageId").delete(protect, deleteMessage);

module.exports = router;
=======
const express = require("express");
const {
  allMessages,
  sendMessage,
  sendFileMessage,
  deleteMessage,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.route("/file").post(protect, upload.single('file'), sendFileMessage);
router.route("/delete/:messageId").delete(protect, deleteMessage);

module.exports = router;
>>>>>>> 594d3b6b06fb7016060d793786bbccb77db42e0d
