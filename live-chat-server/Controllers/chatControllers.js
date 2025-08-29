<<<<<<< HEAD
const asyncHandler = require("express-async-handler");
const Chat = require("../modals/chatModel");
const User = require("../modals/userModel");

const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    console.log("UserId param not sent with request");
    return res.sendStatus(400);
  }

  // Check if either user has blocked the other
  const currentUser = await User.findById(req.user._id);
  const targetUser = await User.findById(userId);
  
  if (!currentUser || !targetUser) {
    res.status(404);
    throw new Error("User not found");
  }

  // Check if current user has blocked the target user
  if (currentUser.blockedUsers && currentUser.blockedUsers.includes(userId)) {
    res.status(403);
    throw new Error("Cannot create chat with blocked user");
  }

  // Check if target user has blocked the current user
  if (targetUser.blockedUsers && targetUser.blockedUsers.includes(req.user._id)) {
    res.status(403);
    throw new Error("Cannot create chat with user who has blocked you");
  }

  var isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name email",
  });

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id })
        .populate("users", "-password")
        .populate("latestMessage");
      
      res.status(200).json(FullChat);
      
      // Emit socket event for new chat creation (after response is sent)
      const io = req.app.get("io");
      if (io) {
        console.log("Emitting new chat notification to users:", FullChat.users.map(u => u._id));
        // Broadcast to all users in the chat
        for (const userId of FullChat.users) {
          console.log(`Sending notification to user: ${userId._id}`);
          io.to(`user:${userId._id}`).emit("notification:new_chat", FullChat);
        }
      }
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  }
});

const fetchChats = asyncHandler(async (req, res) => {
  try {
    console.log("Fetch Chats aPI : ", req);
    
    // Get current user's blocked users
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      console.log("Error: Current user not found:", req.user._id);
      return res.status(404).json({ message: "User not found" });
    }
    
    const blockedUserIds = currentUser.blockedUsers || [];
    console.log("Current user blocked users:", blockedUserIds);
    
    // Fetch chats and filter out blocked users
    const results = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });
    
    console.log("Found chats before filtering:", results.length);
    
    // Filter out chats with blocked users
    const filteredResults = results.filter(chat => {
      // Skip chats with no users or incomplete data
      if (!chat.users || chat.users.length === 0) {
        console.log("Warning: Chat has no users:", chat._id);
        return false;
      }
      
      // Ensure blockedUserIds is an array
      if (!Array.isArray(blockedUserIds)) {
        console.log("Warning: blockedUserIds is not an array:", blockedUserIds);
        return true; // Allow all chats if blocked users data is corrupted
      }
      
      if (chat.isGroupChat) {
        // For group chats, check if any blocked users are in the group
        return !chat.users.some(user => blockedUserIds.includes(user._id.toString()));
      } else {
        // For individual chats, check if the other user is blocked
        const otherUser = chat.users.find(user => user._id.toString() !== req.user._id.toString());
        // Skip chats where we can't find the other user (data corruption or incomplete population)
        if (!otherUser) {
          console.log("Warning: Chat has incomplete user data:", chat._id);
          return false; // Filter out chats with incomplete data
        }
        return !blockedUserIds.includes(otherUser._id.toString());
      }
    });
    
    console.log("Chats after filtering:", filteredResults.length);
    
    const populatedResults = await User.populate(filteredResults, {
      path: "latestMessage.sender",
      select: "name email",
    });
    
    res.status(200).send(populatedResults);
  } catch (error) {
    console.error("Error in fetchChats:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

const fetchGroups = asyncHandler(async (req, res) => {
  try {
    const allGroups = await Chat.where("isGroupChat").equals(true);
    res.status(200).send(allGroups);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const fetchChatById = asyncHandler(async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");
    
    if (!chat) {
      res.status(404);
      throw new Error("Chat not found");
    }
    
    res.status(200).json(chat);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const createGroupChat = asyncHandler(async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: "Data is insufficient" });
  }

  var users = JSON.parse(req.body.users);
  console.log("chatController/createGroups : ", req);
  users.push(req.user);

  // Check if any of the users are blocked by the current user
  const currentUser = await User.findById(req.user._id);
  if (currentUser && currentUser.blockedUsers && currentUser.blockedUsers.length > 0) {
    const blockedUserIds = currentUser.blockedUsers;
    const blockedUsersInGroup = users.filter(user => 
      blockedUserIds.includes(user._id.toString())
    );
    
    if (blockedUsersInGroup.length > 0) {
      res.status(403);
      throw new Error("Cannot create group with blocked users");
    }
  }

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");

    res.status(200).json(fullGroupChat);
    
         // Emit socket event for new group chat creation (after response is sent)
     const io = req.app.get("io");
     if (io) {
       console.log("Emitting new group chat notification to users:", fullGroupChat.users.map(u => u._id));
       // Broadcast to all users in the group
       for (const userId of fullGroupChat.users) {
         console.log(`Sending group chat notification to user: ${userId._id}`);
         io.to(`user:${userId._id}`).emit("notification:new_chat", fullGroupChat);
       }
     }
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const groupExit = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  // check if the requester is admin

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!removed) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(removed);
  }
});

const deleteChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  try {
    // Check if the user is part of this chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      res.status(404);
      throw new Error("Chat Not Found");
    }

    // Check if the user is part of this chat
    if (!chat.users.includes(req.user._id)) {
      res.status(403);
      throw new Error("Not authorized to delete this chat");
    }

    // Delete the chat
    await Chat.findByIdAndDelete(chatId);
    
    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = {
  accessChat,
  fetchChats,
  fetchGroups,
  fetchChatById,
  createGroupChat,
  groupExit,
  deleteChat,
};
=======
const asyncHandler = require("express-async-handler");
const Chat = require("../modals/chatModel");
const User = require("../modals/userModel");

const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    console.log("UserId param not sent with request");
    return res.sendStatus(400);
  }

  // Check if either user has blocked the other
  const currentUser = await User.findById(req.user._id);
  const targetUser = await User.findById(userId);
  
  if (!currentUser || !targetUser) {
    res.status(404);
    throw new Error("User not found");
  }

  // Check if current user has blocked the target user
  if (currentUser.blockedUsers && currentUser.blockedUsers.includes(userId)) {
    res.status(403);
    throw new Error("Cannot create chat with blocked user");
  }

  // Check if target user has blocked the current user
  if (targetUser.blockedUsers && targetUser.blockedUsers.includes(req.user._id)) {
    res.status(403);
    throw new Error("Cannot create chat with user who has blocked you");
  }

  var isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name email",
  });

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id })
        .populate("users", "-password")
        .populate("latestMessage");
      
      res.status(200).json(FullChat);
      
      // Emit socket event for new chat creation (after response is sent)
      const io = req.app.get("io");
      if (io) {
        console.log("Emitting new chat notification to users:", FullChat.users.map(u => u._id));
        // Broadcast to all users in the chat
        for (const userId of FullChat.users) {
          console.log(`Sending notification to user: ${userId._id}`);
          io.to(`user:${userId._id}`).emit("notification:new_chat", FullChat);
        }
      }
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  }
});

const fetchChats = asyncHandler(async (req, res) => {
  try {
    console.log("Fetch Chats aPI : ", req);
    
    // Get current user's blocked users
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      console.log("Error: Current user not found:", req.user._id);
      return res.status(404).json({ message: "User not found" });
    }
    
    const blockedUserIds = currentUser.blockedUsers || [];
    console.log("Current user blocked users:", blockedUserIds);
    
    // Fetch chats and filter out blocked users
    const results = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });
    
    console.log("Found chats before filtering:", results.length);
    
    // Filter out chats with blocked users
    const filteredResults = results.filter(chat => {
      // Skip chats with no users or incomplete data
      if (!chat.users || chat.users.length === 0) {
        console.log("Warning: Chat has no users:", chat._id);
        return false;
      }
      
      // Ensure blockedUserIds is an array
      if (!Array.isArray(blockedUserIds)) {
        console.log("Warning: blockedUserIds is not an array:", blockedUserIds);
        return true; // Allow all chats if blocked users data is corrupted
      }
      
      if (chat.isGroupChat) {
        // For group chats, check if any blocked users are in the group
        return !chat.users.some(user => blockedUserIds.includes(user._id.toString()));
      } else {
        // For individual chats, check if the other user is blocked
        const otherUser = chat.users.find(user => user._id.toString() !== req.user._id.toString());
        // Skip chats where we can't find the other user (data corruption or incomplete population)
        if (!otherUser) {
          console.log("Warning: Chat has incomplete user data:", chat._id);
          return false; // Filter out chats with incomplete data
        }
        return !blockedUserIds.includes(otherUser._id.toString());
      }
    });
    
    console.log("Chats after filtering:", filteredResults.length);
    
    const populatedResults = await User.populate(filteredResults, {
      path: "latestMessage.sender",
      select: "name email",
    });
    
    res.status(200).send(populatedResults);
  } catch (error) {
    console.error("Error in fetchChats:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

const fetchGroups = asyncHandler(async (req, res) => {
  try {
    const allGroups = await Chat.where("isGroupChat").equals(true);
    res.status(200).send(allGroups);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const fetchChatById = asyncHandler(async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");
    
    if (!chat) {
      res.status(404);
      throw new Error("Chat not found");
    }
    
    res.status(200).json(chat);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const createGroupChat = asyncHandler(async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: "Data is insufficient" });
  }

  var users = JSON.parse(req.body.users);
  console.log("chatController/createGroups : ", req);
  users.push(req.user);

  // Check if any of the users are blocked by the current user
  const currentUser = await User.findById(req.user._id);
  if (currentUser && currentUser.blockedUsers && currentUser.blockedUsers.length > 0) {
    const blockedUserIds = currentUser.blockedUsers;
    const blockedUsersInGroup = users.filter(user => 
      blockedUserIds.includes(user._id.toString())
    );
    
    if (blockedUsersInGroup.length > 0) {
      res.status(403);
      throw new Error("Cannot create group with blocked users");
    }
  }

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");

    res.status(200).json(fullGroupChat);
    
         // Emit socket event for new group chat creation (after response is sent)
     const io = req.app.get("io");
     if (io) {
       console.log("Emitting new group chat notification to users:", fullGroupChat.users.map(u => u._id));
       // Broadcast to all users in the group
       for (const userId of fullGroupChat.users) {
         console.log(`Sending group chat notification to user: ${userId._id}`);
         io.to(`user:${userId._id}`).emit("notification:new_chat", fullGroupChat);
       }
     }
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const groupExit = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  // check if the requester is admin

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!removed) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(removed);
  }
});

const deleteChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  try {
    // Check if the user is part of this chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      res.status(404);
      throw new Error("Chat Not Found");
    }

    // Check if the user is part of this chat
    if (!chat.users.includes(req.user._id)) {
      res.status(403);
      throw new Error("Not authorized to delete this chat");
    }

    // Delete the chat
    await Chat.findByIdAndDelete(chatId);
    
    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = {
  accessChat,
  fetchChats,
  fetchGroups,
  fetchChatById,
  createGroupChat,
  groupExit,
  deleteChat,
};
>>>>>>> 594d3b6b06fb7016060d793786bbccb77db42e0d
