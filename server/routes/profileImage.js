import express from 'express';
import { uploadProfileImage } from '../middleware.js';
import { processProfileImage, deleteImageFile } from '../utils/imageProcessor.js';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// === Get All Images ===
router.get('/', async (req, res) => {
  try {
    const uploadDir = path.join(process.cwd(), 'public/uploads/profile_images');
    const files = await fs.readdir(uploadDir);
    
    // Use Promise.all to get stats for all files
    const images = await Promise.all(
      files
        .filter(file => ['.jpg', '.jpeg', '.png'].includes(path.extname(file).toLowerCase()))
        .map(async file => {
          const stats = await fs.stat(path.join(uploadDir, file));
          return {
            filename: file,
            url: `/uploads/profile_images/${file}`,
            createdAt: stats.birthtime
          };
        })
    );

    // Sort by creation date
    images.sort((a, b) => b.createdAt - a.createdAt);

    res.json(images);
  } catch (err) {
    console.error('Error listing images:', err);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// === Upload Image ===
router.post('/upload', uploadProfileImage.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = await processProfileImage(req.file.path);
    const imageUrl = `/uploads/profile_images/${filename}`;
    
    res.json({ 
      success: true, 
      imageUrl,
      filename,
      message: 'Profile image uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// === Delete Image ===
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    await deleteImageFile(filename);
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete image' });
  }
});

export default router;