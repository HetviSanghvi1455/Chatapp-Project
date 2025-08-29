const mongoose = require("mongoose");

const messageModel = mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    content: {
      type: String,
      trim: true,
    },
    reciever: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    // File attachment fields
    fileType: {
      type: String,
      enum: ['image', 'document', 'audio', 'video', null],
      default: null,
    },
    fileName: {
      type: String,
      trim: true,
    },
    fileUrl: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number,
    },
    // Soft deletion field
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timeStamp: true,
  }
);

const Message = mongoose.model("Message", messageModel);
module.exports = Message;
