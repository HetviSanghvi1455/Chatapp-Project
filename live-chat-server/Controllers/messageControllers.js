<<<<<<< HEAD
const expressAsyncHandler = require("express-async-handler");
const Message = require("../modals/messageModel");
const User = require("../modals/userModel");
const Chat = require("../modals/chatModel");

const allMessages = expressAsyncHandler(async (req, res) => {
  try {
    // Get current user's blocked users
    const currentUser = await User.findById(req.user._id);
    const blockedUserIds = currentUser.blockedUsers || [];
    
    const messages = await Message.find({ 
      chat: req.params.chatId,
      deleted: { $ne: true } // Exclude deleted messages
    })
      .populate("sender", "name email")
      .populate("reciever")
      .populate("chat");
    
    // Filter out messages from blocked users
    const filteredMessages = messages.filter(message => {
      return !blockedUserIds.includes(message.sender._id.toString());
    });
    
    res.json(filteredMessages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const sendMessage = expressAsyncHandler(async (req, res) => {
  const { content, chatId, userId } = req.body;

  if (!content) {
    console.log("Message content is required");
    return res.sendStatus(400);
  }

  // Check if the sender is blocked by any of the recipients
  let chat;
  
  try {
    // If chatId is provided, use existing chat
    if (chatId) {
      chat = await Chat.findById(chatId).populate("users", "-password");
      if (!chat) {
        console.log("Chat not found with provided chatId");
        return res.status(404).json({ message: "Chat not found" });
      }
    } 
    // If userId is provided, find or create chat
    else if (userId) {
      // Check if chat already exists between these users
      chat = await Chat.findOne({
        isGroupChat: false,
        $and: [
          { users: { $elemMatch: { $eq: req.user._id } } },
          { users: { $elemMatch: { $eq: userId } } },
        ],
      }).populate("users", "-password");
      
      // If no chat exists, create one
      if (!chat) {
        console.log("Creating new chat between users:", req.user._id, userId);
        const chatData = {
          chatName: "sender",
          isGroupChat: false,
          users: [req.user._id, userId],
        };
        
        chat = await Chat.create(chatData);
        chat = await Chat.findById(chat._id).populate("users", "-password");
        
        // Emit new chat notification to both users
        const io = req.app.get("io");
        if (io) {
          console.log("Emitting new chat notification for message-initiated chat");
          for (const userId of chat.users) {
            io.to(`user:${userId._id}`).emit("notification:new_chat", chat);
          }
        }
      }
    } else {
      console.log("Either chatId or userId must be provided");
      return res.status(400).json({ message: "Either chatId or userId must be provided" });
    }

    // Check if sender is blocked by any recipient
    const otherUsers = chat.users.filter(user => user._id.toString() !== req.user._id.toString());
    for (const otherUser of otherUsers) {
      const recipient = await User.findById(otherUser._id);
      if (recipient.blockedUsers && recipient.blockedUsers.includes(req.user._id.toString())) {
        console.log("Sender is blocked by recipient:", otherUser._id);
        return res.status(403).json({ message: "You are blocked by this user" });
      }
    }

    var newMessage = {
      sender: req.user._id,
      content: content,
      chat: chat._id,
    };

    var message = await Message.create(newMessage);

    console.log("Created message:", message);
    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await message.populate("reciever");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name email",
    });

    await Chat.findByIdAndUpdate(chat._id, { latestMessage: message });
    
    // Emit socket event for real-time message broadcasting
    const io = req.app.get("io");
    if (io) {
      console.log("Broadcasting message to users:", message.chat.users.map(u => u._id));
      // Broadcast to all users in the chat except sender and blocked users
      for (const userId of message.chat.users) {
        if (userId.toString() !== req.user._id.toString()) {
          // Check if the recipient has blocked the sender
          const recipient = chat.users.find(u => u._id.toString() === userId.toString());
          if (recipient) {
            const recipientUser = await User.findById(recipient._id);
            if (recipientUser && recipientUser.blockedUsers && recipientUser.blockedUsers.includes(req.user._id.toString())) {
              console.log(`Skipping message broadcast to blocked user:${userId}`);
              continue; // Skip broadcasting to blocked users
            }
          }
          console.log(`Emitting new:message to user:${userId}`);
          io.to(`user:${userId}`).emit("new:message", message);
        }
      }
    } else {
      console.log("Socket.IO not available");
    }
    
    res.json(message);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

const sendFileMessage = expressAsyncHandler(async (req, res) => {
  const { content, chatId, userId } = req.body;
  const file = req.file;

  if (!file) {
    console.log("No file uploaded");
    return res.sendStatus(400);
  }

  let chat;
  
  try {
    // If chatId is provided, use existing chat
    if (chatId) {
      chat = await Chat.findById(chatId);
      if (!chat) {
        console.log("Chat not found with provided chatId");
        return res.status(404).json({ message: "Chat not found" });
      }
    } 
    // If userId is provided, find or create chat
    else if (userId) {
      // Check if chat already exists between these users
      chat = await Chat.findOne({
        isGroupChat: false,
        $and: [
          { users: { $elemMatch: { $eq: req.user._id } } },
          { users: { $elemMatch: { $eq: userId } } },
        ],
      }).populate("users", "-password");
      
      // If no chat exists, create one
      if (!chat) {
        console.log("Creating new chat between users for file message:", req.user._id, userId);
        const chatData = {
          chatName: "sender",
          isGroupChat: false,
          users: [req.user._id, userId],
        };
        
        chat = await Chat.create(chatData);
        chat = await Chat.findById(chat._id).populate("users", "-password");
        
        // Emit new chat notification to both users
        const io = req.app.get("io");
        if (io) {
          console.log("Emitting new chat notification for file message-initiated chat");
          for (const userId of chat.users) {
            io.to(`user:${userId._id}`).emit("notification:new_chat", chat);
          }
        }
      }
    } else {
      console.log("Either chatId or userId must be provided");
      return res.status(400).json({ message: "Either chatId or userId must be provided" });
    }

    // Check if sender is blocked by any recipient
    const otherUsers = chat.users.filter(user => user._id.toString() !== req.user._id.toString());
    for (const otherUser of otherUsers) {
      const recipient = await User.findById(otherUser._id);
      if (recipient.blockedUsers && recipient.blockedUsers.includes(req.user._id.toString())) {
        console.log("Sender is blocked by recipient:", otherUser._id);
        return res.status(403).json({ message: "You are blocked by this user" });
      }
    }

    // Create file URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

    var newMessage = {
      sender: req.user._id,
      content: content || "",
      chat: chat._id,
      fileType: file.fileType,
      fileName: file.originalname,
      fileUrl: fileUrl,
      fileSize: file.size,
    };

    var message = await Message.create(newMessage);

    console.log("Created file message:", message);
    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await message.populate("reciever");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name email",
    });

    await Chat.findByIdAndUpdate(chat._id, { latestMessage: message });
    
    // Emit socket event for real-time message broadcasting
    const io = req.app.get("io");
    if (io) {
      console.log("Broadcasting file message to users:", message.chat.users.map(u => u._id));
             // Broadcast to all users in the chat except sender and blocked users
       for (const userId of message.chat.users) {
         if (userId.toString() !== req.user._id.toString()) {
           // Check if the recipient has blocked the sender
           const recipient = chat.users.find(u => u._id.toString() === userId.toString());
           if (recipient) {
             const recipientUser = await User.findById(recipient._id);
             if (recipientUser && recipientUser.blockedUsers && recipientUser.blockedUsers.includes(req.user._id.toString())) {
               console.log(`Skipping file message broadcast to blocked user:${userId}`);
               continue; // Skip broadcasting to blocked users
             }
           }
           console.log(`Emitting new:message to user:${userId}`);
           io.to(`user:${userId}`).emit("new:message", message);
         }
       }
    } else {
      console.log("Socket.IO not available for file message");
    }
    
    res.json(message);
  } catch (error) {
    console.error("Error in sendFileMessage:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

const deleteMessage = expressAsyncHandler(async (req, res) => {
  const { messageId } = req.params;

  if (!messageId) {
    console.log("Message ID is required");
    return res.sendStatus(400);
  }

  try {
    // Find the message and check if the user is the sender
    const message = await Message.findById(messageId);
    
    if (!message) {
      res.status(404);
      throw new Error("Message not found");
    }

    // Check if the user is the sender of the message
    if (message.sender.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You can only delete your own messages");
    }

    // Soft delete the message
    await Message.findByIdAndUpdate(messageId, {
      deleted: true,
      deletedAt: new Date(),
      content: null, // Clear the content
      fileType: null,
      fileName: null,
      fileUrl: null,
      fileSize: null
    });

    // Update the chat's latest message if this was the latest message
    const chat = await Chat.findById(message.chat);
    if (chat && chat.latestMessage && chat.latestMessage.toString() === messageId) {
      // Find the new latest non-deleted message
      const newLatestMessage = await Message.findOne({ 
        chat: message.chat,
        deleted: { $ne: true }
      }).sort({ createdAt: -1 });
      
      await Chat.findByIdAndUpdate(message.chat, { 
        latestMessage: newLatestMessage ? newLatestMessage._id : null 
      });
      
      // Emit socket event for message deletion
      const io = req.app.get("io");
      if (io) {
        // Broadcast to all users in the chat
        for (const userId of chat.users) {
          io.to(`user:${userId}`).emit("message:deleted", { 
            messageId, 
            chatId: message.chat,
            newLatestMessage: newLatestMessage ? newLatestMessage._id : null 
          });
        }
      }
    }

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = { allMessages, sendMessage, sendFileMessage, deleteMessage };
=======
const expressAsyncHandler = require("express-async-handler");
const Message = require("../modals/messageModel");
const User = require("../modals/userModel");
const Chat = require("../modals/chatModel");

const allMessages = expressAsyncHandler(async (req, res) => {
  try {
    // Get current user's blocked users
    const currentUser = await User.findById(req.user._id);
    const blockedUserIds = currentUser.blockedUsers || [];
    
    const messages = await Message.find({ 
      chat: req.params.chatId,
      deleted: { $ne: true } // Exclude deleted messages
    })
      .populate("sender", "name email")
      .populate("reciever")
      .populate("chat");
    
    // Filter out messages from blocked users
    const filteredMessages = messages.filter(message => {
      return !blockedUserIds.includes(message.sender._id.toString());
    });
    
    res.json(filteredMessages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const sendMessage = expressAsyncHandler(async (req, res) => {
  const { content, chatId, userId } = req.body;

  if (!content) {
    console.log("Message content is required");
    return res.sendStatus(400);
  }

  // Check if the sender is blocked by any of the recipients
  let chat;
  
  try {
    // If chatId is provided, use existing chat
    if (chatId) {
      chat = await Chat.findById(chatId).populate("users", "-password");
      if (!chat) {
        console.log("Chat not found with provided chatId");
        return res.status(404).json({ message: "Chat not found" });
      }
    } 
    // If userId is provided, find or create chat
    else if (userId) {
      // Check if chat already exists between these users
      chat = await Chat.findOne({
        isGroupChat: false,
        $and: [
          { users: { $elemMatch: { $eq: req.user._id } } },
          { users: { $elemMatch: { $eq: userId } } },
        ],
      }).populate("users", "-password");
      
      // If no chat exists, create one
      if (!chat) {
        console.log("Creating new chat between users:", req.user._id, userId);
        const chatData = {
          chatName: "sender",
          isGroupChat: false,
          users: [req.user._id, userId],
        };
        
        chat = await Chat.create(chatData);
        chat = await Chat.findById(chat._id).populate("users", "-password");
        
        // Emit new chat notification to both users
        const io = req.app.get("io");
        if (io) {
          console.log("Emitting new chat notification for message-initiated chat");
          for (const userId of chat.users) {
            io.to(`user:${userId._id}`).emit("notification:new_chat", chat);
          }
        }
      }
    } else {
      console.log("Either chatId or userId must be provided");
      return res.status(400).json({ message: "Either chatId or userId must be provided" });
    }

    // Check if sender is blocked by any recipient
    const otherUsers = chat.users.filter(user => user._id.toString() !== req.user._id.toString());
    for (const otherUser of otherUsers) {
      const recipient = await User.findById(otherUser._id);
      if (recipient.blockedUsers && recipient.blockedUsers.includes(req.user._id.toString())) {
        console.log("Sender is blocked by recipient:", otherUser._id);
        return res.status(403).json({ message: "You are blocked by this user" });
      }
    }

    var newMessage = {
      sender: req.user._id,
      content: content,
      chat: chat._id,
    };

    var message = await Message.create(newMessage);

    console.log("Created message:", message);
    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await message.populate("reciever");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name email",
    });

    await Chat.findByIdAndUpdate(chat._id, { latestMessage: message });
    
    // Emit socket event for real-time message broadcasting
    const io = req.app.get("io");
    if (io) {
      console.log("Broadcasting message to users:", message.chat.users.map(u => u._id));
      // Broadcast to all users in the chat except sender and blocked users
      for (const userId of message.chat.users) {
        if (userId.toString() !== req.user._id.toString()) {
          // Check if the recipient has blocked the sender
          const recipient = chat.users.find(u => u._id.toString() === userId.toString());
          if (recipient) {
            const recipientUser = await User.findById(recipient._id);
            if (recipientUser && recipientUser.blockedUsers && recipientUser.blockedUsers.includes(req.user._id.toString())) {
              console.log(`Skipping message broadcast to blocked user:${userId}`);
              continue; // Skip broadcasting to blocked users
            }
          }
          console.log(`Emitting new:message to user:${userId}`);
          io.to(`user:${userId}`).emit("new:message", message);
        }
      }
    } else {
      console.log("Socket.IO not available");
    }
    
    res.json(message);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

const sendFileMessage = expressAsyncHandler(async (req, res) => {
  const { content, chatId, userId } = req.body;
  const file = req.file;

  if (!file) {
    console.log("No file uploaded");
    return res.sendStatus(400);
  }

  let chat;
  
  try {
    // If chatId is provided, use existing chat
    if (chatId) {
      chat = await Chat.findById(chatId);
      if (!chat) {
        console.log("Chat not found with provided chatId");
        return res.status(404).json({ message: "Chat not found" });
      }
    } 
    // If userId is provided, find or create chat
    else if (userId) {
      // Check if chat already exists between these users
      chat = await Chat.findOne({
        isGroupChat: false,
        $and: [
          { users: { $elemMatch: { $eq: req.user._id } } },
          { users: { $elemMatch: { $eq: userId } } },
        ],
      }).populate("users", "-password");
      
      // If no chat exists, create one
      if (!chat) {
        console.log("Creating new chat between users for file message:", req.user._id, userId);
        const chatData = {
          chatName: "sender",
          isGroupChat: false,
          users: [req.user._id, userId],
        };
        
        chat = await Chat.create(chatData);
        chat = await Chat.findById(chat._id).populate("users", "-password");
        
        // Emit new chat notification to both users
        const io = req.app.get("io");
        if (io) {
          console.log("Emitting new chat notification for file message-initiated chat");
          for (const userId of chat.users) {
            io.to(`user:${userId._id}`).emit("notification:new_chat", chat);
          }
        }
      }
    } else {
      console.log("Either chatId or userId must be provided");
      return res.status(400).json({ message: "Either chatId or userId must be provided" });
    }

    // Check if sender is blocked by any recipient
    const otherUsers = chat.users.filter(user => user._id.toString() !== req.user._id.toString());
    for (const otherUser of otherUsers) {
      const recipient = await User.findById(otherUser._id);
      if (recipient.blockedUsers && recipient.blockedUsers.includes(req.user._id.toString())) {
        console.log("Sender is blocked by recipient:", otherUser._id);
        return res.status(403).json({ message: "You are blocked by this user" });
      }
    }

    // Create file URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

    var newMessage = {
      sender: req.user._id,
      content: content || "",
      chat: chat._id,
      fileType: file.fileType,
      fileName: file.originalname,
      fileUrl: fileUrl,
      fileSize: file.size,
    };

    var message = await Message.create(newMessage);

    console.log("Created file message:", message);
    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await message.populate("reciever");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name email",
    });

    await Chat.findByIdAndUpdate(chat._id, { latestMessage: message });
    
    // Emit socket event for real-time message broadcasting
    const io = req.app.get("io");
    if (io) {
      console.log("Broadcasting file message to users:", message.chat.users.map(u => u._id));
             // Broadcast to all users in the chat except sender and blocked users
       for (const userId of message.chat.users) {
         if (userId.toString() !== req.user._id.toString()) {
           // Check if the recipient has blocked the sender
           const recipient = chat.users.find(u => u._id.toString() === userId.toString());
           if (recipient) {
             const recipientUser = await User.findById(recipient._id);
             if (recipientUser && recipientUser.blockedUsers && recipientUser.blockedUsers.includes(req.user._id.toString())) {
               console.log(`Skipping file message broadcast to blocked user:${userId}`);
               continue; // Skip broadcasting to blocked users
             }
           }
           console.log(`Emitting new:message to user:${userId}`);
           io.to(`user:${userId}`).emit("new:message", message);
         }
       }
    } else {
      console.log("Socket.IO not available for file message");
    }
    
    res.json(message);
  } catch (error) {
    console.error("Error in sendFileMessage:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

const deleteMessage = expressAsyncHandler(async (req, res) => {
  const { messageId } = req.params;

  if (!messageId) {
    console.log("Message ID is required");
    return res.sendStatus(400);
  }

  try {
    // Find the message and check if the user is the sender
    const message = await Message.findById(messageId);
    
    if (!message) {
      res.status(404);
      throw new Error("Message not found");
    }

    // Check if the user is the sender of the message
    if (message.sender.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You can only delete your own messages");
    }

    // Soft delete the message
    await Message.findByIdAndUpdate(messageId, {
      deleted: true,
      deletedAt: new Date(),
      content: null, // Clear the content
      fileType: null,
      fileName: null,
      fileUrl: null,
      fileSize: null
    });

    // Update the chat's latest message if this was the latest message
    const chat = await Chat.findById(message.chat);
    if (chat && chat.latestMessage && chat.latestMessage.toString() === messageId) {
      // Find the new latest non-deleted message
      const newLatestMessage = await Message.findOne({ 
        chat: message.chat,
        deleted: { $ne: true }
      }).sort({ createdAt: -1 });
      
      await Chat.findByIdAndUpdate(message.chat, { 
        latestMessage: newLatestMessage ? newLatestMessage._id : null 
      });
      
      // Emit socket event for message deletion
      const io = req.app.get("io");
      if (io) {
        // Broadcast to all users in the chat
        for (const userId of chat.users) {
          io.to(`user:${userId}`).emit("message:deleted", { 
            messageId, 
            chatId: message.chat,
            newLatestMessage: newLatestMessage ? newLatestMessage._id : null 
          });
        }
      }
    }

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = { allMessages, sendMessage, sendFileMessage, deleteMessage };
>>>>>>> 594d3b6b06fb7016060d793786bbccb77db42e0d
