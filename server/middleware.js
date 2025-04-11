import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Existing middleware functions
export function loggerMiddleware(req, res, next) {
  console.log(`${req.method} ${req.path}`);
  next();
}

export function errorHandler(err, req, res, next) {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
}

// Image upload configuration
const profileImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public/uploads/profile_images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

const profileImageFilter = (req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.heic'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and HEIC files are allowed!'), false);
  }
};

export const uploadProfileImage = multer({
  storage: profileImageStorage,
  fileFilter: profileImageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Enhanced error handler for different error types
export function enhancedErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    // Handle Multer errors (file size, etc.)
    console.error('Upload Error:', err.message);
    return res.status(400).json({ 
      error: 'File upload error',
      details: err.message 
    });
  } else if (err) {
    // Handle other errors
    console.error('Error:', err.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  next();
}

// Export all middleware
export default {
  loggerMiddleware,
  errorHandler,
  enhancedErrorHandler,
  uploadProfileImage
};