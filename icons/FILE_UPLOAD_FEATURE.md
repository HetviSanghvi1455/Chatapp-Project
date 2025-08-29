# File Upload & Message Deletion Feature Documentation

## Overview
The chat application now supports file and photo sharing functionality, as well as message deletion. Users can send various types of files including images, documents, audio, and video files, and delete their own messages from chats.

## Features

### File Sharing
- **Images**: JPG, PNG, GIF, BMP, WebP, etc.
- **Documents**: PDF, Word documents, text files, etc.
- **Audio**: MP3, WAV, AAC, etc.
- **Video**: MP4, AVI, MOV, etc.

### Message Deletion
- **Soft Deletion**: Messages are marked as deleted but remain in the database
- **Own Messages Only**: Users can only delete their own messages
- **Confirmation Dialog**: Prevents accidental deletions
- **Visual Feedback**: Deleted messages show "This message was deleted" placeholder

### File Size Limit
- Maximum file size: 10MB per file

### File Upload Process
1. Click the attachment icon (📎) in the chat input area
2. Select a file from your device
3. The file will be uploaded with a progress indicator
4. Once uploaded, the file will appear in the chat

### Message Deletion Process
1. Hover over your own message to reveal the delete button (🗑️)
2. Click the delete button to open confirmation dialog
3. Confirm deletion in the dialog
4. Message will be marked as deleted and show placeholder text

### File Display
- **Images**: Displayed inline with click-to-view functionality
- **Other files**: Show file name, size, and type with download button
- **Download**: Click the download icon to save files locally

## Technical Implementation

### Backend Changes
- Updated `messageModel.js` to include file attachment fields and soft deletion
- Created `uploadMiddleware.js` for file handling with multer
- Added `sendFileMessage` and `deleteMessage` controller functions
- Updated message routes to include file upload and deletion endpoints
- Added static file serving for uploaded files

### Frontend Changes
- Updated `ChatArea.js` with file upload functionality and message deletion handling
- Enhanced `MessageSelf.js` and `MessageOthers.js` to display files and deletion options
- Added progress indicators, error handling, and confirmation dialogs
- Implemented file type detection and appropriate icons

### File Storage
- Files are stored in the `uploads/` directory on the server
- Files are served statically via `/uploads/` endpoint
- Unique filenames are generated to prevent conflicts

## API Endpoints

### Upload File
```
POST /message/file
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- file: The file to upload
- content: Optional message text
- chatId: The chat ID to send the message to
```

### Delete Message
```
DELETE /message/delete/:messageId
Authorization: Bearer <token>
```

### Response Examples

#### File Upload Response
```json
{
  "sender": {...},
  "content": "Optional message",
  "fileType": "image|document|audio|video",
  "fileName": "original_filename.jpg",
  "fileUrl": "http://localhost:8080/uploads/file-1234567890.jpg",
  "fileSize": 1024000,
  "chat": {...},
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Delete Message Response
```json
{
  "message": "Message deleted successfully"
}
```

## Security Features
- File type validation on both client and server
- File size limits enforced
- Authentication required for all uploads and deletions
- Secure file naming to prevent path traversal
- Users can only delete their own messages
- Soft deletion prevents data loss

## Usage Examples

### Sending an Image
1. Click the attachment icon
2. Select an image file
3. Optionally add a caption in the text field
4. The image will be displayed inline in the chat

### Sending a Document
1. Click the attachment icon
2. Select a document file (PDF, Word, etc.)
3. The document will appear as a file card with download option

### Deleting a Message
1. Hover over your message to reveal the delete button
2. Click the delete button (🗑️)
3. Confirm deletion in the dialog
4. Message will show "This message was deleted"

### Downloading Files
- Click the download icon on any file attachment
- Files will be downloaded with their original filename

## Error Handling
- File size too large: Shows error message
- Invalid file type: Shows error message
- Upload failure: Shows error message with retry option
- Network issues: Progress indicator shows upload status
- Deletion permission denied: Shows error message
- Message not found: Shows appropriate error

## Database Schema Updates

### Message Model Fields
```javascript
{
  sender: ObjectId,
  content: String,
  chat: ObjectId,
  // File attachment fields
  fileType: String, // 'image', 'document', 'audio', 'video', null
  fileName: String,
  fileUrl: String,
  fileSize: Number,
  // Soft deletion fields
  deleted: Boolean, // default: false
  deletedAt: Date, // default: null
  createdAt: Date,
  updatedAt: Date
}
```

## Future Enhancements
- File preview for documents
- Audio/video player integration
- File compression for large images
- Cloud storage integration
- File sharing permissions
- Message editing functionality
- Bulk message deletion
- Message recovery for admins
- Message reactions and replies
