import React, { useContext, useEffect, useState } from "react";
import "./myStyles.css";
import SearchIcon from "@mui/icons-material/Search";
import BlockIcon from "@mui/icons-material/Block";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { IconButton } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import logo from "../Images/live-chat_512px.png";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { refreshSidebarFun } from "../Features/refreshSidebar";
import { myContext } from "./MainContainer";
import { io } from "socket.io-client";

function Users() {
  // const [refresh, setRefresh] = useState(true);
  const { refresh, setRefresh } = useContext(myContext);

  const lightTheme = useSelector((state) => state.themeKey);
  const [users, setUsers] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [directMessageModal, setDirectMessageModal] = useState({ open: false, user: null, message: "" });
  const [blockConfirmModal, setBlockConfirmModal] = useState({ open: false, user: null });
  const userData = JSON.parse(localStorage.getItem("userData"));
  // console.log("Data from LocalStorage : ", userData);
  const nav = useNavigate();
  const dispatch = useDispatch();

  if (!userData) {
    console.log("User not Authenticated");
    nav(-1);
  }

  useEffect(() => {
    console.log("Users refreshed");
    const config = {
      headers: {
        Authorization: `Bearer ${userData.data.token}`,
      },
    };
    axios.get("http://localhost:8080/user/fetchUsers", config).then((data) => {
      console.log("UData refreshed in Users panel ");
      setUsers(data.data);
      // setRefresh(!refresh);
    });

    // Fetch blocked users
    axios.get("http://localhost:8080/user/blocked", config).then((data) => {
      console.log("Blocked users fetched");
      setBlockedUsers(data.data);
    });
  }, [refresh]);

  // Socket connection for real-time updates
  useEffect(() => {
    if (!userData) return;
    
    const socket = io("http://localhost:8080", { 
      transports: ["websocket", "polling"] 
    });

    socket.on("connect", () => {
      console.log("Users component socket connected");
      socket.emit("join:user", userData.data._id);
    });

    // Listen for user blocking events
    socket.on("user:blocked", (data) => {
      console.log("Users component received user blocked event:", data);
      // Refresh users list
      setRefresh(prev => !prev);
    });

    // Listen for user unblocking events
    socket.on("user:unblocked", (data) => {
      console.log("Users component received user unblocked event:", data);
      // Refresh users list
      setRefresh(prev => !prev);
    });

    return () => {
      socket.disconnect();
    };
  }, [userData]);

  const handleUnblockUser = async (userId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userData.data.token}`,
        },
      };

      await axios.post("http://localhost:8080/user/unblock", { userId }, config);
      console.log("User unblocked successfully");
      
      // Show success message
      alert("User unblocked successfully!");
      
      // Refresh the blocked users list
      const response = await axios.get("http://localhost:8080/user/blocked", config);
      setBlockedUsers(response.data);
      
      // Refresh the main users list
      const usersResponse = await axios.get("http://localhost:8080/user/fetchUsers", config);
      setUsers(usersResponse.data);
      
      // Refresh sidebar
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error unblocking user:", error);
      alert("Failed to unblock user: " + (error.response?.data?.message || error.message));
    }
  };

  const handleBlockUser = async (userId) => {
    try {
      console.log("Attempting to block user:", userId);
      const config = {
        headers: {
          Authorization: `Bearer ${userData.data.token}`,
        },
      };

      const response = await axios.post("http://localhost:8080/user/block", { userId }, config);
      console.log("Block response:", response.data);
      
      // Show success message
      alert("User blocked successfully!");
      
      // Refresh the blocked users list
      const blockedResponse = await axios.get("http://localhost:8080/user/blocked", config);
      console.log("Blocked users response:", blockedResponse.data);
      setBlockedUsers(blockedResponse.data);
      
      // Refresh the main users list
      const usersResponse = await axios.get("http://localhost:8080/user/fetchUsers", config);
      console.log("Users response:", usersResponse.data);
      setUsers(usersResponse.data);
      
      // Refresh sidebar
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error blocking user:", error);
      alert("Failed to block user: " + (error.response?.data?.message || error.message));
    }
  };

  const handleDirectMessage = (user) => {
    setDirectMessageModal({ open: true, user, message: "" });
  };

  const sendDirectMessage = async () => {
    if (!directMessageModal.message.trim()) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userData.data.token}`,
        },
      };

      // Send message directly to user (this will create a chat if it doesn't exist)
      await axios.post(
        "http://localhost:8080/message/",
        {
          content: directMessageModal.message,
          userId: directMessageModal.user._id,
        },
        config
      );

      console.log("Direct message sent successfully");
      
      // Close modal and refresh sidebar to show new chat
      setDirectMessageModal({ open: false, user: null, message: "" });
      setRefresh(!refresh);
      
      // Show success message
      alert("Message sent successfully! A new chat has been created.");
    } catch (error) {
      console.error("Error sending direct message:", error);
      alert("Failed to send message: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{
          duration: "0.3",
        }}
        className="list-container"
      >
        <div className={"ug-header" + (lightTheme ? "" : " dark")}>
          <img
            src={logo}
            style={{ height: "2rem", width: "2rem", marginLeft: "10px" }}
          />
          <p className={"ug-title" + (lightTheme ? "" : " dark")}>
            {showBlockedUsers ? "Blocked Users" : "Available Users"}
          </p>
          <IconButton
            className={"icon" + (lightTheme ? "" : " dark")}
            onClick={() => {
              setShowBlockedUsers(!showBlockedUsers);
            }}
            title={showBlockedUsers ? "Show Available Users" : "Show Blocked Users"}
          >
            {showBlockedUsers ? <PersonAddIcon /> : <BlockIcon />}
          </IconButton>
          <IconButton
            className={"icon" + (lightTheme ? "" : " dark")}
            onClick={() => {
              setRefresh(!refresh);
            }}
          >
            <RefreshIcon />
          </IconButton>
        </div>
        <div className={"sb-search" + (lightTheme ? "" : " dark")}>
          <IconButton className={"icon" + (lightTheme ? "" : " dark")}>
            <SearchIcon />
          </IconButton>
          <input
            placeholder="Search"
            className={"search-box" + (lightTheme ? "" : " dark")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="ug-list">
          {showBlockedUsers ? (
            // Show blocked users
            blockedUsers
              .filter((user) => {
                if (searchTerm === "") return true;
                return user.name.toLowerCase().includes(searchTerm.toLowerCase());
              })
              .map((user, index) => (
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={"list-tem" + (lightTheme ? "" : " dark")}
                  key={index}
                >
                  <p className={"con-icon" + (lightTheme ? "" : " dark")}>B</p>
                  <p className={"con-title" + (lightTheme ? "" : " dark")}>
                    {user.name}
                  </p>
                  <IconButton
                    className={"icon" + (lightTheme ? "" : " dark")}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnblockUser(user._id);
                    }}
                    title="Unblock User"
                    size="small"
                  >
                    <PersonAddIcon />
                  </IconButton>
                </motion.div>
              ))
          ) : (
            // Show available users
            users
              .filter((user) => {
                if (searchTerm === "") return true;
                return user.name.toLowerCase().includes(searchTerm.toLowerCase());
              })
              .map((user, index) => (
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={"list-tem" + (lightTheme ? "" : " dark")}
                  key={index}
                >
                  <div 
                    className="user-info"
                    onClick={() => {
                      console.log("Creating chat with ", user.name);
                      const config = {
                        headers: {
                          Authorization: `Bearer ${userData.data.token}`,
                        },
                      };
                      axios.post(
                        "http://localhost:8080/chat/",
                        {
                          userId: user._id,
                        },
                        config
                      );
                      dispatch(refreshSidebarFun());
                    }}
                  >
                    <p className={"con-icon" + (lightTheme ? "" : " dark")}>T</p>
                    <p className={"con-title" + (lightTheme ? "" : " dark")}>
                      {user.name}
                    </p>
                  </div>
                  
                  {/* User Actions */}
                  <div className="user-actions">
                    <button
                      className="direct-message-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDirectMessage(user);
                      }}
                      title="Send Direct Message"
                    >
                      💬
                    </button>
                    <IconButton
                      className={"icon" + (lightTheme ? "" : " dark")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setBlockConfirmModal({ open: true, user });
                      }}
                      title="Block User"
                      size="small"
                    >
                      <BlockIcon />
                    </IconButton>
                  </div>
                </motion.div>
              ))
          )}
        </div>
      </motion.div>

      {/* Direct Message Modal */}
      {directMessageModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Send Message to {directMessageModal.user?.name}</h3>
            <textarea
              value={directMessageModal.message}
              onChange={(e) => setDirectMessageModal(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Type your message here..."
              rows="4"
              style={{ width: "100%", margin: "10px 0", padding: "8px" }}
            />
            <div className="modal-actions">
              <button 
                onClick={() => setDirectMessageModal({ open: false, user: null, message: "" })}
                style={{ marginRight: "10px", padding: "8px 16px" }}
              >
                Cancel
              </button>
              <button 
                onClick={sendDirectMessage}
                style={{ padding: "8px 16px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px" }}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block User Confirmation Modal */}
      {blockConfirmModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Block User</h3>
            <p>Are you sure you want to block <strong>{blockConfirmModal.user?.name}</strong>?</p>
            <p style={{ fontSize: "14px", color: "#666", marginTop: "10px" }}>
              This will:
              <br />• Remove them from your chat list
              <br />• Hide their messages from you
              <br />• Prevent them from sending you new messages
            </p>
            <div className="modal-actions">
              <button 
                onClick={() => setBlockConfirmModal({ open: false, user: null })}
                style={{ marginRight: "10px", padding: "8px 16px" }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleBlockUser(blockConfirmModal.user._id);
                  setBlockConfirmModal({ open: false, user: null });
                }}
                style={{ padding: "8px 16px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px" }}
              >
                Block User
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default Users;
