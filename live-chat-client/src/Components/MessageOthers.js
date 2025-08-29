import React from "react";
import "./myStyles.css";
import { useDispatch, useSelector } from "react-redux";
import { IconButton, Tooltip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ImageIcon from "@mui/icons-material/Image";
import DescriptionIcon from "@mui/icons-material/Description";
import AudioFileIcon from "@mui/icons-material/AudioFile";
import VideoFileIcon from "@mui/icons-material/VideoFile";

function MessageOthers({ props }) {
  const dispatch = useDispatch();
  const lightTheme = useSelector((state) => state.themeKey);
  // console.log("message others : ", props);
  
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

  return (
    <div className={"other-message-container" + (lightTheme ? "" : " dark")}>
      <div className={"conversation-container" + (lightTheme ? "" : " dark")}>
        <p className={"con-icon" + (lightTheme ? "" : " dark")}>
          {props.sender.name[0]}
        </p>
        <div className={"other-text-content" + (lightTheme ? "" : " dark")}>
          <p className={"con-title" + (lightTheme ? "" : " dark")}>
            {props.sender.name}
          </p>
          
          {props.content && (
            <p className={"con-lastMessage" + (lightTheme ? "" : " dark")}>
              {props.content}
            </p>
          )}
          
          {/* File attachment display */}
          {props.fileType && props.fileUrl && (
            <div style={{ 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              padding: '12px',
              backgroundColor: lightTheme ? '#f9f9f9' : '#2a2a2a',
              marginTop: props.content ? '8px' : '0',
              color: lightTheme ? '#333' : '#fff'
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
                    <div style={{ fontSize: '12px', color: lightTheme ? '#666' : '#ccc' }}>
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
          
          {/* <p className="self-timeStamp">12:00am</p> */}
        </div>
      </div>
    </div>
  );
}

export default MessageOthers;
