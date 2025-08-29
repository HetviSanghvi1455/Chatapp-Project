import React, { useState, useEffect, useContext } from "react";
import DoneOutlineRoundedIcon from "@mui/icons-material/DoneOutlineRounded";
import AddIcon from "@mui/icons-material/Add";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Chip,
  Box,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { myContext } from "./MainContainer";

function CreateGroups() {
  const lightTheme = useSelector((state) => state.themeKey);
  const userData = JSON.parse(localStorage.getItem("userData"));
  const nav = useNavigate();

  if (!userData) {
    console.log("User not Authenticated");
    nav("/");
  }

  const user = userData.data;

  // ✅ useContext imported properly
  const { refresh, setRefresh } = useContext(myContext);

  const [groupName, setGroupName] = useState("");
  const [open, setOpen] = React.useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // Fetch available users when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };
        const response = await axios.get("http://localhost:8080/user/fetchUsers", config);
        setAvailableUsers(response.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, [user.token]);

  const handleUserToggle = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    if (selectedUsers.length === 0) {
      alert("Please select at least one member for the group");
      return;
    }

    setLoading(true);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      console.log("Creating group with data:", {
        name: groupName,
        users: selectedUsers,
        usersString: JSON.stringify(selectedUsers),
      });

      const response = await axios.post(
        "http://localhost:8080/chat/createGroup",
        {
          name: groupName,
          users: JSON.stringify(selectedUsers),
        },
        config
      );

      console.log("Group created successfully:", response.data);

      // Clear the form
      setGroupName("");
      setSelectedUsers([]);

      // Refresh the sidebar and navigate to groups
      setRefresh(!refresh);
      nav("/app/groups");
    } catch (error) {
      console.error("Error creating group:", error);
      if (error.response && error.response.data) {
        alert(`Failed to create group: ${error.response.data.message || error.message}`);
      } else {
        alert("Failed to create group. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div>
        <Dialog
          open={open}
          onClose={handleClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle id="alert-dialog-title">
            Create Group: {groupName}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Select members to add to your group. You will be the admin of this group.
            </DialogContentText>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Members ({selectedUsers.length}):
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {selectedUsers.map((userId) => {
                  const user = availableUsers.find((u) => u._id === userId);
                  return user ? (
                    <Chip
                      key={userId}
                      label={user.name}
                      onDelete={() => handleUserToggle(userId)}
                      size="small"
                    />
                  ) : null;
                })}
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Available Users:
              </Typography>
              <List sx={{ maxHeight: 200, overflow: "auto" }}>
                {availableUsers.map((user) => (
                  <ListItem key={user._id} dense>
                    <ListItemText primary={user.name} secondary={user.email} />
                    <ListItemSecondaryAction>
                      <Checkbox
                        edge="end"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => handleUserToggle(user._id)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="primary">
              Cancel
            </Button>
            <Button
              onClick={() => {
                createGroup();
                handleClose();
              }}
              variant="contained"
              disabled={loading || selectedUsers.length === 0}
              autoFocus
            >
              {loading ? "Creating..." : "Create Group"}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
      <div className={"createGroups-container" + (lightTheme ? "" : " dark")}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            width: "100%",
          }}
        >
          <TextField
            placeholder="Enter Group Name"
            variant="outlined"
            size="small"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            fullWidth
          />

          {selectedUsers.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              <Typography variant="caption" sx={{ mr: 1 }}>
                Selected: {selectedUsers.length} member(s)
              </Typography>
              {selectedUsers.slice(0, 3).map((userId) => {
                const user = availableUsers.find((u) => u._id === userId);
                return user ? (
                  <Chip key={userId} label={user.name} size="small" variant="outlined" />
                ) : null;
              })}
              {selectedUsers.length > 3 && (
                <Chip
                  label={`+${selectedUsers.length - 3} more`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          )}
        </div>

        <IconButton
          className={"icon" + (lightTheme ? "" : " dark")}
          onClick={() => {
            if (!groupName.trim()) {
              alert("Please enter a group name first");
              return;
            }
            handleClickOpen();
          }}
          disabled={!groupName.trim()}
        >
          <AddIcon />
        </IconButton>
      </div>
    </>
  );
}

export default CreateGroups;
