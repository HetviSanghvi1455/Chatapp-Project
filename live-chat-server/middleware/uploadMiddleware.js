<<<<<<< HEAD
const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allow images
  if (file.mimetype.startsWith('image/')) {
    file.fileType = 'image';
    return cb(null, true);
  }
  
  // Allow documents
  if (file.mimetype.includes('pdf') || 
      file.mimetype.includes('document') || 
      file.mimetype.includes('text') ||
      file.mimetype.includes('application/')) {
    file.fileType = 'document';
    return cb(null, true);
  }
  
  // Allow audio files
  if (file.mimetype.startsWith('audio/')) {
    file.fileType = 'audio';
    return cb(null, true);
  }
  
  // Allow video files
  if (file.mimetype.startsWith('video/')) {
    file.fileType = 'video';
    return cb(null, true);
  }
  
  // Reject other file types
  cb(new Error('Invalid file type. Only images, documents, audio, and video files are allowed.'), false);
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

module.exports = upload;
=======
const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allow images
  if (file.mimetype.startsWith('image/')) {
    file.fileType = 'image';
    return cb(null, true);
  }
  
  // Allow documents
  if (file.mimetype.includes('pdf') || 
      file.mimetype.includes('document') || 
      file.mimetype.includes('text') ||
      file.mimetype.includes('application/')) {
    file.fileType = 'document';
    return cb(null, true);
  }
  
  // Allow audio files
  if (file.mimetype.startsWith('audio/')) {
    file.fileType = 'audio';
    return cb(null, true);
  }
  
  // Allow video files
  if (file.mimetype.startsWith('video/')) {
    file.fileType = 'video';
    return cb(null, true);
  }
  
  // Reject other file types
  cb(new Error('Invalid file type. Only images, documents, audio, and video files are allowed.'), false);
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

module.exports = upload;
>>>>>>> 594d3b6b06fb7016060d793786bbccb77db42e0d
