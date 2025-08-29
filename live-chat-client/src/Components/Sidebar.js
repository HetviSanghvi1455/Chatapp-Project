import React, { useContext, useEffect, useState } from "react";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { IconButton, Badge, Chip } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import NightlightIcon from "@mui/icons-material/Nightlight";
import LightModeIcon from "@mui/icons-material/LightMode";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toggleTheme } from "../Features/themeSlice";
import axios from "axios";
import { refreshSidebarFun } from "../Features/refreshSidebar";
import { myContext } from "./MainContainer";
import { io } from "socket.io-client";

function Sidebar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const lightTheme = useSelector((state) => state.themeKey);
  // const refresh = useSelector((state) => state.refreshKey);
  const { refresh, setRefresh } = useContext(myContext);
  console.log("Context API : refresh : ", refresh);
  const [conversations, setConversations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newChatIds, setNewChatIds] = useState([]);
  const [socketInstance, setSocketInstance] = useState(null);
  const [fetchingChats, setFetchingChats] = useState(new Set());
  // console.log("Conversations of Sidebar : ", conversations);
  const userData = JSON.parse(localStorage.getItem("userData"));
  // console.log("Data from LocalStorage : ", userData);
  const nav = useNavigate();
  if (!userData) {
    console.log("User not Authenticated");
    nav("/");
  }

  const user = userData.data;
  // Track known chat IDs in localStorage per user to compute "new chats"
  const storageKey = userData ? `knownChats:${userData.data._id}` : null;
  const getKnownChats = () => {
    if (!storageKey) return [];
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null; // null means uninitialized for this device
    } catch {
      return null;
    }
  };
  const setKnownChats = (ids) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(ids));
    } catch {}
  };
  const markChatKnown = (chatId) => {
    const prev = getKnownChats();
    const base = Array.isArray(prev) ? prev : [];
    if (!base.includes(chatId)) {
      const updated = [...base, chatId];
      setKnownChats(updated);
    }
    setNewChatIds((ids) => ids.filter((id) => id !== chatId));
  };

  useEffect(() => {
    // console.log("Sidebar : ", user.token);
    const config = {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };

    axios.get("http://localhost:8080/chat/", config).then((response) => {
      console.log("Data refresh in sidebar ", response.data);
      setConversations(response.data);
      // Compute new chats based on local known set
      const fetchedIds = response.data.map((c) => c._id);
      const known = getKnownChats();
      if (known === null) {
        // First time: seed known to current to avoid false positives
        setKnownChats(fetchedIds);
        setNewChatIds([]);
      } else {
        const knownArray = Array.isArray(known) ? known : [];
        const unseen = fetchedIds.filter((id) => !knownArray.includes(id));
        setNewChatIds(unseen);
      }
      // setRefresh(!refresh);
    });
  }, [refresh]);
  
  // Periodic check for new chats (fallback for missed socket notifications)
  useEffect(() => {
    const interval = setInterval(() => {
      if (socketInstance && socketInstance.connected) {
        // Only check if socket is connected, otherwise rely on manual refresh
        return;
      }
      
      // Check for new chats every 30 seconds if socket is not connected
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      
      axios.get("http://localhost:8080/chat/", config).then((response) => {
        setConversations(prev => {
          const currentIds = prev.map(c => c._id);
          const newChats = response.data.filter(chat => !currentIds.includes(chat._id));
          
          if (newChats.length > 0) {
            console.log("Found new chats via periodic check:", newChats.length);
            // Add new chats to conversations
            const updatedConversations = [...newChats, ...prev];
            
            // Mark as new chats
            const newChatIds = newChats.map(chat => chat._id);
            setNewChatIds(prevIds => {
              const combined = [...new Set([...prevIds, ...newChatIds])];
              return combined;
            });
            
            return updatedConversations;
          }
          return prev;
        });
      }).catch(error => {
        console.error("Error in periodic chat check:", error);
      });
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [socketInstance, user.token]);

  // Socket.IO: connect and listen for new chat notifications
  useEffect(() => {
    if (!userData) return;
    // Avoid creating multiple connections
    if (socketInstance) return;
    
    console.log("Initializing sidebar socket connection for user:", userData.data._id);
    const socket = io("http://localhost:8080", { transports: ["websocket", "polling"] });
    setSocketInstance(socket);

    socket.on("connect", () => {
      console.log("Sidebar socket connected, joining user room:", userData.data._id);
      socket.emit("join:user", userData.data._id);
    });

    socket.on("notification:new_chat", (chat) => {
      console.log("Sidebar received new chat notification:", chat);
      console.log("Chat users:", chat.users);
      console.log("Is group chat:", chat.isGroupChat);
      
      // Add to conversations if not present
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === chat._id);
        if (!exists) {
          // If the chat doesn't have proper user data, fetch it from the server
          if (!chat.users || chat.users.length === 0) {
            console.log("Chat missing user data, fetching from server...");
            
            // Mark this chat as being fetched
            setFetchingChats(prev => new Set(prev).add(chat._id));
            
            const config = {
              headers: {
                Authorization: `Bearer ${user.token}`,
              },
            };
            
            // Fetch the chat details to get populated user data
            axios.get(`http://localhost:8080/chat/${chat._id}`, config)
              .then((response) => {
                const fetchedChat = response.data;
                console.log("Fetched chat data:", fetchedChat);
                
                // Update conversations with the fetched data
                setConversations((currentConversations) => {
                  const updatedConversations = currentConversations.map((conv) => 
                    conv._id === chat._id ? fetchedChat : conv
                  );
                  return updatedConversations;
                });
                
                // Remove from fetching state
                setFetchingChats(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(chat._id);
                  return newSet;
                });
              })
              .catch((error) => {
                console.error("Error fetching chat data:", error);
                // Remove from fetching state on error too
                setFetchingChats(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(chat._id);
                  return newSet;
                });
              });
          }
          
          // Ensure the chat object has the proper structure
          const formattedChat = {
            ...chat,
            // If it's an individual chat, ensure users array is properly formatted
            users: chat.users || [],
            // Set a default chatName for individual chats if not present
            chatName: chat.chatName || (chat.isGroupChat ? chat.chatName : 'New Chat'),
            // Ensure latestMessage is undefined for new chats
            latestMessage: undefined
          };
          
          console.log("Formatted chat:", formattedChat);
          
          // Mark this as a new chat immediately
          setNewChatIds((prevIds) => (prevIds.includes(chat._id) ? prevIds : [chat._id, ...prevIds]));
          return [formattedChat, ...prev];
        }
        return prev;
      });
    });
    
    // Also listen for connection events to handle reconnection
    socket.on("connect", () => {
      console.log("Socket reconnected, refreshing conversations...");
      // Refresh conversations when socket reconnects
      setRefresh(prev => !prev);
    });

    // Listen for new messages to update latest message in conversations
    socket.on("new:message", (message) => {
      console.log("Sidebar received new message:", message.content);
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv._id === message.chat._id) {
            console.log("Updating conversation with new message:", conv.chatName || "Individual Chat");
            return { ...conv, latestMessage: message };
          }
          return conv;
        });
      });
    });

    // Listen for user blocking events
    socket.on("user:blocked", (data) => {
      console.log("Sidebar received user blocked event:", data);
      // Refresh conversations to remove blocked user's chat
      setRefresh(prev => !prev);
    });

    // Listen for user unblocking events
    socket.on("user:unblocked", (data) => {
      console.log("Sidebar received user unblocked event:", data);
      // Refresh conversations to show unblocked user's chat
      setRefresh(prev => !prev);
    });

    // Listen for message deletion to update conversations
    socket.on("message:deleted", (data) => {
      console.log("Sidebar received message deletion:", data);
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv._id === data.chatId) {
            if (data.newLatestMessage === null) {
              return { ...conv, latestMessage: undefined };
            }
            return conv;
          }
          return conv;
        });
      });
    });

    return () => {
      console.log("Disconnecting sidebar socket");
      socket.disconnect();
    };
  }, [userData, socketInstance]);

  return (
    <div className="sidebar-container">
      <div className={"sb-header" + (lightTheme ? "" : " dark")}>
        <div className="other-icons">
          <IconButton
            onClick={() => {
              nav("/app/welcome");
            }}
          >
            <Badge color="primary" badgeContent={newChatIds.length} invisible={newChatIds.length === 0}>
              <AccountCircleIcon
                className={"icon" + (lightTheme ? "" : " dark")}
              />
            </Badge>
          </IconButton>

          <IconButton
            onClick={() => {
              navigate("users");
            }}
          >
            <PersonAddIcon className={"icon" + (lightTheme ? "" : " dark")} />
          </IconButton>
          <IconButton
            onClick={() => {
              navigate("groups");
            }}
          >
            <GroupAddIcon className={"icon" + (lightTheme ? "" : " dark")} />
          </IconButton>
          <IconButton
            onClick={() => {
              navigate("create-groups");
            }}
          >
            <AddCircleIcon className={"icon" + (lightTheme ? "" : " dark")} />
          </IconButton>

          <IconButton
            onClick={() => {
              dispatch(toggleTheme());
            }}
          >
            {lightTheme && (
              <NightlightIcon
                className={"icon" + (lightTheme ? "" : " dark")}
              />
            )}
            {!lightTheme && (
              <LightModeIcon className={"icon" + (lightTheme ? "" : " dark")} />
            )}
          </IconButton>
          <IconButton
            onClick={() => {
              localStorage.removeItem("userData");
              navigate("/");
            }}
          >
            <ExitToAppIcon className={"icon" + (lightTheme ? "" : " dark")} />
          </IconButton>
        </div>
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
                 {newChatIds.length > 0 && (
           <Chip 
             label={`${newChatIds.length} NEW CHAT${newChatIds.length > 1 ? 'S' : ''}`} 
             color="error" 
             size="small" 
             style={{ 
               marginLeft: "8px", 
               fontWeight: "bold",
               animation: "pulse 1.5s infinite"
             }} 
           />
         )}
         {fetchingChats.size > 0 && (
           <Chip 
             label={`${fetchingChats.size} LOADING`} 
             color="warning" 
             size="small" 
             style={{ 
               marginLeft: "8px", 
               fontWeight: "bold"
             }} 
           />
         )}
      </div>
      <div className={"sb-conversations" + (lightTheme ? "" : " dark")}>
        {conversations
          .filter((conversation) => {
            if (searchTerm === "") return true;
            
            if (conversation.isGroupChat) {
              // For group chats, search by group name
              return conversation.chatName.toLowerCase().includes(searchTerm.toLowerCase());
            } else {
              // For individual chats, search by other user's name
              const otherUser = conversation.users.find(user => user._id !== userData.data._id);
              if (!otherUser) return false;
              return otherUser.name.toLowerCase().includes(searchTerm.toLowerCase());
            }
          })
          .map((conversation, index) => {
          // console.log("current convo : ", conversation);
          if (conversation.users.length === 1) {
            return <div key={index}></div>;
          }
          
                     if (conversation.isGroupChat) {
             // Handle group chat display
             const displayName = conversation.chatName || "Loading Group...";
             const displayIcon = displayName && displayName.length > 0 ? displayName[0] : "?";
            
            if (conversation.latestMessage === undefined) {
              return (
                <div
                  key={index}
                  className="conversation-container"
                  onClick={() => {
                    navigate(
                      "chat/" +
                        conversation._id +
                        "&" +
                        displayName
                    );
                  }}
                >
                  <p className={"con-icon" + (lightTheme ? "" : " dark")}>
                    {displayIcon}
                  </p>
                  <p className={"con-title" + (lightTheme ? "" : " dark")}>
                    {displayName}
                  </p>
                  <p className="con-lastMessage">
                    No previous Messages, click here to start a new chat
                  </p>
                </div>
              );
            } else {
              return (
                <div
                  key={index}
                  className="conversation-container"
                  onClick={() => {
                    markChatKnown(conversation._id);
                    navigate(
                      "chat/" +
                        conversation._id +
                        "&" +
                        displayName
                    );
                  }}
                >
                  <p className={"con-icon" + (lightTheme ? "" : " dark")}>
                    {displayIcon}
                  </p>
                  <p className={"con-title" + (lightTheme ? "" : " dark")}>
                    {displayName}
                  </p>
                  <p className="con-lastMessage">
                    {conversation.latestMessage.content}
                  </p>
                  {newChatIds.includes(conversation._id) && (
                    <Chip 
                      label="NEW" 
                      color="primary" 
                      size="small" 
                      style={{ 
                        marginLeft: "8px", 
                        fontWeight: "bold",
                        animation: "pulse 2s infinite"
                      }} 
                    />
                  )}
                </div>
              );
            }
                     } else {
             // Handle individual chat display
             // Find the other user (not the current logged-in user)
             const otherUser = conversation.users.find(user => user._id !== userData.data._id);
             
             // If no other user found, try to show a temporary display
             const displayName = otherUser ? otherUser.name : "Loading User...";
             
             if (!otherUser) {
               console.log("No other user found in conversation:", conversation);
               // Show a fallback for chats with missing user data
               return (
                 <div
                   key={index}
                   className={`conversation-container ${fetchingChats.has(conversation._id) ? 'loading' : ''}`}
                   onClick={() => {
                     markChatKnown(conversation._id);
                     navigate("chat/" + conversation._id + "&Unknown User");
                   }}
                 >
                   <p className={"con-icon" + (lightTheme ? "" : " dark")}>
                     {fetchingChats.has(conversation._id) ? "⏳" : "?"}
                   </p>
                   <p className={"con-title" + (lightTheme ? "" : " dark")}>
                     {fetchingChats.has(conversation._id) ? "Loading..." : "Unknown User"}
                   </p>
                   <p className="con-lastMessage">
                     {fetchingChats.has(conversation._id) ? "Fetching user data..." : "User data unavailable"}
                   </p>
                   {newChatIds.includes(conversation._id) && (
                     <Chip 
                       label="NEW" 
                       color="primary" 
                       size="small" 
                       style={{ 
                         marginLeft: "8px", 
                         fontWeight: "bold",
                         animation: "pulse 2s infinite"
                       }} 
                     />
                   )}
                 </div>
               );
             }
            
            if (conversation.latestMessage === undefined) {
            // console.log("No Latest Message with ", otherUser.name);
            return (
              <div
                key={index}
                onClick={() => {
                  console.log("Refresh fired from sidebar");
                  // dispatch(refreshSidebarFun());
                  setRefresh(!refresh);
                }}
              >
                <div
                  key={index}
                  className="conversation-container"
                  onClick={() => {
                    markChatKnown(conversation._id);
                                         navigate(
                       "chat/" +
                         conversation._id +
                         "&" +
                         displayName
                       );
                  }}
                  // dispatch change to refresh so as to update chatArea
                >
                  <p className={"con-icon" + (lightTheme ? "" : " dark")}>
                    {displayName[0]}
                  </p>
                  <p className={"con-title" + (lightTheme ? "" : " dark")}>
                    {displayName}
                  </p>

                  <p className="con-lastMessage">
                    No previous Messages, click here to start a new chat
                  </p>
                  {newChatIds.includes(conversation._id) && (
                    <Chip 
                      label="NEW" 
                      color="primary" 
                      size="small" 
                      style={{ 
                        marginLeft: "8px", 
                        fontWeight: "bold",
                        animation: "pulse 2s infinite"
                      }} 
                    />
                  )}
                  {/* <p className={"con-timeStamp" + (lightTheme ? "" : " dark")}>
                {conversation.timeStamp}
              </p> */}
                </div>
              </div>
            );
          } else {
            return (
              <div
                key={index}
                className="conversation-container"
                                   onClick={() => {
                     markChatKnown(conversation._id);
                     navigate(
                       "chat/" +
                         conversation._id +
                         "&" +
                         displayName
                       );
                   }}
              >
                <p className={"con-icon" + (lightTheme ? "" : " dark")}>
                  {displayName[0]}
                </p>
                <p className={"con-title" + (lightTheme ? "" : " dark")}>
                  {displayName}
                </p>

                <p className="con-lastMessage">
                  {conversation.latestMessage.content}
                </p>
                {newChatIds.includes(conversation._id) && (
                  <Chip label="New" color="success" size="small" />
                )}
                {/* <p className={"con-timeStamp" + (lightTheme ? "" : " dark")}>
                {conversation.timeStamp}
              </p> */}
              </div>
            );
          }
        }
        })}
      </div>
    </div>
  );
}

export default Sidebar;
