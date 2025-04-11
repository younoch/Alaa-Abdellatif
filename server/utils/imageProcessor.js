import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

// === Helper ===
const logProcessing = (original, processed) => {
  console.log('Image processed:', { original, processed });
};

// === Main Processor ===
export async function processProfileImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let outputBuffer;
  
  try {
    // Convert HEIC to JPEG if needed
    if (ext === '.heic') {
      console.log('Converting HEIC to JPEG:', filePath);
      const inputBuffer = await readFile(filePath);
      outputBuffer = await heicConvert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 0.8
      });
      
      await unlink(filePath);
      const newFilePath = filePath.replace('.heic', '.jpg');
      await fs.promises.writeFile(newFilePath, outputBuffer);
      filePath = newFilePath;
    }
    
    // Process image (resize, optimize)
    console.log('Processing image:', filePath);
    const processedImage = await sharp(filePath)
      .resize(500, 500, {
        fit: 'cover',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    await fs.promises.writeFile(filePath, processedImage);
    logProcessing(path.basename(filePath), path.basename(filePath));
    
    return path.basename(filePath);
  } catch (err) {
    console.error('Image processing failed:', {
      error: err,
      file: filePath
    });
    throw err;
  }
}
export async function deleteImageFile(filename) {
    try {
      const filePath = path.join(process.cwd(), 'public/uploads/profile_images', filename);
      await fs.promises.unlink(filePath);
      console.log('Deleted file:', filePath);
      return true;
    } catch (err) {
      console.error('Error deleting file:', err);
      throw err;
    }
  }