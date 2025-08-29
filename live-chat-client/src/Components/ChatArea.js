import React, { useContext, useEffect, useRef, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import BlockIcon from "@mui/icons-material/Block";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar, Alert } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MessageSelf from "./MessageSelf";
import MessageOthers from "./MessageOthers";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import Skeleton from "@mui/material/Skeleton";
import axios from "axios";
import { myContext } from "./MainContainer";
import { io } from "socket.io-client";

function ChatArea() {
  const lightTheme = useSelector((state) => state.themeKey);
  const [messageContent, setMessageContent] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const dyParams = useParams();
  const navigate = useNavigate();
  const [chat_id, chat_user] = dyParams._id.split("&");
  // console.log(chat_id, chat_user);
  const userData = JSON.parse(localStorage.getItem("userData"));
  const [allMessages, setAllMessages] = useState([]);
  const [chatInfo, setChatInfo] = useState(null);
  const [isGroupChat, setIsGroupChat] = useState(false);
  // console.log("Chat area id : ", chat_id._id);
  // const refresh = useSelector((state) => state.refreshKey);
  const { refresh, setRefresh } = useContext(myContext);
  const [loaded, setloaded] = useState(false);
  const [socket, setSocket] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    if (!userData) return;
    
    console.log("Initializing socket connection for user:", userData.data._id);
    const newSocket = io("http://localhost:8080", { 
      transports: ["websocket", "polling"] 
    });
    
    setSocket(newSocket);

    // Join user room
    newSocket.on("connect", () => {
      console.log("Socket connected, joining user room:", userData.data._id);
      newSocket.emit("join:user", userData.data._id);
    });

    // Listen for new messages
    newSocket.on("new:message", (message) => {
      console.log("Received new message:", message);
      // Only add message if it belongs to current chat
      if (message.chat._id === chat_id) {
        console.log("Adding message to current chat:", message.content);
        setAllMessages(prev => [...prev, message]);
        // Update chat's latest message
        setChatInfo(prev => prev ? { ...prev, latestMessage: message } : prev);
      } else {
        console.log("Message not for current chat. Current chat:", chat_id, "Message chat:", message.chat._id);
      }
    });

    // Listen for message deletion
    newSocket.on("message:deleted", (data) => {
      console.log("Received message deletion:", data);
      if (data.chatId === chat_id) {
        console.log("Removing deleted message from current chat:", data.messageId);
        // Remove deleted message from local state
        setAllMessages(prev => prev.filter(msg => msg._id !== data.messageId));
        
        // Update chat info if latest message was deleted
        if (data.newLatestMessage === null) {
          setChatInfo(prev => prev ? { ...prev, latestMessage: undefined } : prev);
        }
      }
    });

    return () => {
      console.log("Disconnecting socket");
      newSocket.disconnect();
    };
  }, [userData, chat_id]);

  const sendMessage = () => {
    // console.log("SendMessage Fired to", chat_id._id);
    const config = {
      headers: {
        Authorization: `Bearer ${userData.data.token}`,
      },
    };
    axios
      .post(
        "http://localhost:8080/message/",
        {
          content: messageContent,
          chatId: chat_id,
        },
        config
      )
      .then(({ data }) => {
        console.log("Message Fired");
        // Message will be automatically broadcasted by the server
      });
  };

  const sendFileMessage = async (file) => {
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: "File size must be less than 10MB",
        severity: "error"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('content', messageContent);
    formData.append('chatId', chat_id);

    const config = {
      headers: {
        Authorization: `Bearer ${userData.data.token}`,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(percentCompleted);
      },
    };

    try {
      const { data } = await axios.post(
        "http://localhost:8080/message/file",
        formData,
        config
      );
      
      setSnackbar({
        open: true,
        message: "File sent successfully!",
        severity: "success"
      });
      
      setMessageContent("");
      // Message will be automatically broadcasted by the server
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error sending file:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to send file",
        severity: "error"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      sendFileMessage(file);
    }
    // Reset the input
    event.target.value = '';
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleMessageDelete = (messageId) => {
    // Remove the deleted message from the local state
    setAllMessages(prevMessages => prevMessages.filter(msg => msg._id !== messageId));
  };

  const handleDeleteChat = async () => {
    try {
      if (isGroupChat) {
        console.log("Leaving group:", chat_id);
        setIsDeleting(true);
        setShowDeleteDialog(false);
        
        const config = {
          headers: {
            Authorization: `Bearer ${userData.data.token}`,
          },
        };

        // For group chats, use groupExit API
        await axios.put("http://localhost:8080/chat/groupExit", {
          chatId: chat_id,
          userId: userData.data._id
        }, config);
        
        console.log("Left group successfully");
      } else {
        console.log("Deleting chat:", chat_id);
        setIsDeleting(true);
        setShowDeleteDialog(false);
        
        const config = {
          headers: {
            Authorization: `Bearer ${userData.data.token}`,
          },
        };

        // Call the delete API for individual chats
        await axios.delete(`http://localhost:8080/chat/${chat_id}`, config);
        
        console.log("Chat deleted successfully");
      }
      
      // Refresh the sidebar to remove the chat/group
      setRefresh(!refresh);
      
      // Navigate back to welcome page
      navigate("/app/welcome");
    } catch (error) {
      console.error("Error handling chat:", error);
      setIsDeleting(false);
      // You could show an error message to the user here
    }
  };

  const handleBlockUser = async () => {
    try {
      console.log("Blocking user:", chat_user);
      setIsBlocking(true);
      setShowBlockDialog(false);
      
      const config = {
        headers: {
          Authorization: `Bearer ${userData.data.token}`,
        },
      };

      // Get the other user's ID from the chat
      const otherUserId = allMessages.find(msg => 
        msg.sender._id !== userData.data._id
      )?.sender._id;

      if (!otherUserId) {
        console.error("Could not find other user ID");
        setIsBlocking(false);
        return;
      }

      // Call the block API
      await axios.post("http://localhost:8080/user/block", 
        { userId: otherUserId }, 
        config
      );
      
      console.log("User blocked successfully");
      
      // Refresh the sidebar to remove the blocked user's chat
      setRefresh(!refresh);
      
      // Navigate back to welcome page
      navigate("/app/welcome");
    } catch (error) {
      console.error("Error blocking user:", error);
      setIsBlocking(false);
      // You could show an error message to the user here
    }
  };
  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // };

  useEffect(() => {
    console.log("Chat area refreshed for chat:", chat_id);
    const config = {
      headers: {
        Authorization: `Bearer ${userData.data.token}`,
      },
    };

    // First, fetch chat information to determine if it's a group chat
    const fetchChatInfo = async () => {
      try {
        // Get chat info from the conversations list in sidebar
        const chatResponse = await axios.get("http://localhost:8080/chat/", config);
        const chat = chatResponse.data.find(c => c._id === chat_id);
        
        if (chat) {
          setChatInfo(chat);
          setIsGroupChat(chat.isGroupChat);
          console.log("Chat info:", chat);
        }
      } catch (error) {
        console.error("Error fetching chat info:", error);
      }
    };

    // Then fetch messages
    const fetchMessages = async () => {
      try {
        const response = await axios.get("http://localhost:8080/message/" + chat_id, config);
        setAllMessages(response.data);
        setloaded(true);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setloaded(true);
      }
    };

    fetchChatInfo();
    fetchMessages();
  }, [refresh, chat_id, userData.data.token]);

  if (!loaded) {
    return (
      <div
        style={{
          border: "20px",
          padding: "10px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <Skeleton
          variant="rectangular"
          sx={{ width: "100%", borderRadius: "10px" }}
          height={60}
        />
        <Skeleton
          variant="rectangular"
          sx={{
            width: "100%",
            borderRadius: "10px",
            flexGrow: "1",
          }}
        />
        <Skeleton
          variant="rectangular"
          sx={{ width: "100%", borderRadius: "10px" }}
          height={60}
        />
      </div>
    );
  } else {
    return (
      <>
        <div className={"chatArea-container" + (lightTheme ? "" : " dark")}>
          <div className={"chatArea-header" + (lightTheme ? "" : " dark")}>
            <p className={"con-icon" + (lightTheme ? "" : " dark")}>
              {isGroupChat ? "G" : chat_user[0]}
            </p>
            <div className={"header-text" + (lightTheme ? "" : " dark")}>
              <p className={"con-title" + (lightTheme ? "" : " dark")}>
                {chat_user}
              </p>
              {isGroupChat && chatInfo && (
                <p className="con-subtitle" style={{ fontSize: '0.8em', opacity: 0.7 }}>
                  {chatInfo.users?.length || 0} members
                </p>
              )}
              {/* <p className={"con-timeStamp" + (lightTheme ? "" : " dark")}>
                {props.timeStamp}
              </p> */}
            </div>
            
            {/* Only show block button for individual chats */}
            {!isGroupChat && (
              <IconButton 
                className={"icon" + (lightTheme ? "" : " dark")}
                onClick={() => setShowBlockDialog(true)}
                title="Block User"
              >
                <BlockIcon />
              </IconButton>
            )}
            
            <IconButton 
              className={"icon" + (lightTheme ? "" : " dark")}
              onClick={() => setShowDeleteDialog(true)}
              title={isGroupChat ? "Leave Group" : "Delete Chat"}
            >
              <DeleteIcon />
            </IconButton>
          </div>
          <div className={"messages-container" + (lightTheme ? "" : " dark")}>
            {allMessages
              .slice(0)
              .reverse()
              .map((message, index) => {
                const sender = message.sender;
                const self_id = userData.data._id;
                if (sender._id === self_id) {
                  // console.log("I sent it ");
                  return <MessageSelf props={message} key={index} onMessageDelete={handleMessageDelete} />;
                } else {
                  // console.log("Someone Sent it");
                  return <MessageOthers props={message} key={index} />;
                }
              })}
          </div>
          <div ref={messagesEndRef} className="BOTTOM" />
          <div className={"text-input-area" + (lightTheme ? "" : " dark")}>
            <input
              placeholder="Type a Message"
              className={"search-box" + (lightTheme ? "" : " dark")}
              value={messageContent}
              onChange={(e) => {
                setMessageContent(e.target.value);
              }}
              onKeyDown={(event) => {
                if (event.code == "Enter") {
                  // console.log(event);
                  sendMessage();
                  setMessageContent("");
                  setRefresh(!refresh);
                }
              }}
            />
            
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*,audio/*,video/*"
            />
            
            <IconButton
              className={"icon" + (lightTheme ? "" : " dark")}
              onClick={handleAttachmentClick}
              disabled={isUploading}
              title="Attach file"
            >
              <AttachFileIcon />
            </IconButton>
            
            <IconButton
              className={"icon" + (lightTheme ? "" : " dark")}
              onClick={() => {
                sendMessage();
                setRefresh(!refresh);
              }}
              disabled={isUploading}
            >
              <SendIcon />
            </IconButton>
          </div>
          
          {/* Upload progress indicator */}
          {isUploading && (
            <div style={{ 
              padding: '8px 16px', 
              backgroundColor: lightTheme ? '#f5f5f5' : '#333',
              borderTop: '1px solid #ddd'
            }}>
              <div style={{ 
                width: '100%', 
                backgroundColor: '#ddd', 
                borderRadius: '4px',
                height: '4px'
              }}>
                <div style={{ 
                  width: `${uploadProgress}%`, 
                  backgroundColor: '#1976d2', 
                  height: '100%',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ 
                fontSize: '12px', 
                marginTop: '4px',
                color: lightTheme ? '#666' : '#ccc'
              }}>
                Uploading... {uploadProgress}%
              </div>
            </div>
          )}
        </div>
        
        {/* Block User Confirmation Dialog - Only for individual chats */}
        {!isGroupChat && (
          <Dialog
            open={showBlockDialog}
            onClose={() => setShowBlockDialog(false)}
            aria-labelledby="block-dialog-title"
          >
            <DialogTitle id="block-dialog-title">
              Block User
            </DialogTitle>
            <DialogContent>
              Are you sure you want to block {chat_user}? This will:
              <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                <li>Remove them from your chat list</li>
                <li>Hide them from your available users</li>
                <li>Prevent them from sending you messages</li>
              </ul>
              You can unblock them later from your profile settings.
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowBlockDialog(false)} color="primary">
                Cancel
              </Button>
              <Button 
                onClick={handleBlockUser} 
                color="warning" 
                variant="contained"
                disabled={isBlocking}
              >
                {isBlocking ? "Blocking..." : "Block User"}
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Delete/Leave Confirmation Dialog */}
        <Dialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          aria-labelledby="delete-dialog-title"
        >
          <DialogTitle id="delete-dialog-title">
            {isGroupChat ? "Leave Group" : "Delete Chat"}
          </DialogTitle>
          <DialogContent>
            {isGroupChat 
              ? `Are you sure you want to leave the group "${chat_user}"? You can rejoin if you're invited again.`
              : "Are you sure you want to delete this chat? This action cannot be undone."
            }
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDeleteDialog(false)} color="primary">
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteChat} 
              color="error" 
              variant="contained"
              disabled={isDeleting}
            >
              {isDeleting 
                ? (isGroupChat ? "Leaving..." : "Deleting...") 
                : (isGroupChat ? "Leave Group" : "Delete Chat")
              }
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }
}

export default ChatArea;
