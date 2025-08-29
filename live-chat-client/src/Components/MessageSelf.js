import React, { useState } from "react";
import { IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageIcon from "@mui/icons-material/Image";
import DescriptionIcon from "@mui/icons-material/Description";
import AudioFileIcon from "@mui/icons-material/AudioFile";
import VideoFileIcon from "@mui/icons-material/VideoFile";
import axios from "axios";

function MessageSelf({ props, onMessageDelete }) {
  // console.log("Message self Prop : ", props);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon />;
      case 'document':
        return <DescriptionIcon />;
      case 'audio':
        return <AudioFileIcon />;
      case 'video':
        return <VideoFileIcon />;
      default:
        return <DescriptionIcon />;
    }
  };

  const handleFileDownload = () => {
    if (props.fileUrl) {
      const link = document.createElement('a');
      link.href = props.fileUrl;
      link.download = props.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteMessage = async () => {
    setIsDeleting(true);
    try {
      const userData = JSON.parse(localStorage.getItem("userData"));
      const config = {
        headers: {
          Authorization: `Bearer ${userData.data.token}`,
        },
      };

      await axios.delete(`http://localhost:8080/message/delete/${props._id}`, config);
      
      // Call the callback to refresh messages
      if (onMessageDelete) {
        onMessageDelete(props._id);
      }
      
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting message:", error);
      alert(error.response?.data?.message || "Failed to delete message");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="self-message-container">
        <div className="messageBox">
          {props.deleted ? (
            <p style={{ 
              color: "#999", 
              fontStyle: "italic",
              marginBottom: "0"
            }}>
              This message was deleted
            </p>
          ) : (
            <>
              {props.content && (
                <p style={{ color: "black", marginBottom: props.fileType ? "8px" : "0" }}>
                  {props.content}
                </p>
              )}
              
              {/* File attachment display */}
              {props.fileType && props.fileUrl && (
                <div style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  padding: '12px',
                  backgroundColor: '#f9f9f9',
                  marginTop: props.content ? '8px' : '0'
                }}>
                  {/* Image display */}
                  {props.fileType === 'image' && (
                    <div style={{ textAlign: 'center' }}>
                      <img 
                        src={props.fileUrl} 
                        alt={props.fileName || 'Image'} 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '300px', 
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(props.fileUrl, '_blank')}
                      />
                    </div>
                  )}
                  
                  {/* File info for non-images */}
                  {props.fileType !== 'image' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getFileIcon(props.fileType)}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          {props.fileName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {formatFileSize(props.fileSize)}
                        </div>
                      </div>
                      <Tooltip title="Download file">
                        <IconButton 
                          size="small" 
                          onClick={handleFileDownload}
                          style={{ color: '#1976d2' }}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </div>
                  )}
                  
                  {/* Download button for images */}
                  {props.fileType === 'image' && (
                    <div style={{ textAlign: 'center', marginTop: '8px' }}>
                      <Tooltip title="Download image">
                        <IconButton 
                          size="small" 
                          onClick={handleFileDownload}
                          style={{ color: '#1976d2' }}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </div>
                  )}
                </div>
              )}
              
              {/* Message actions */}
              <div className="message-actions">
                <Tooltip title="Delete message">
                  <IconButton 
                    size="small" 
                    onClick={() => setShowDeleteDialog(true)}
                    className="delete-button"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
            </>
          )}
          
          {/* <p className="self-timeStamp" style={{ color: "black" }}>
            12:00am
          </p> */}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        aria-labelledby="delete-message-dialog-title"
      >
        <DialogTitle id="delete-message-dialog-title">
          Delete Message
        </DialogTitle>
        <DialogContent>
          Are you sure you want to delete this message? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteMessage} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default MessageSelf;
