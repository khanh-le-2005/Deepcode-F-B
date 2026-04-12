import mongoose from 'mongoose';
import sharp from 'sharp';
import { Image } from '../models/Image.js';
import { Counter } from '../models/Counter.js';

let gfsBucket;

// Initialize GridFSBucket when the connection is open
mongoose.connection.once('open', () => {
  gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'images'
  });
});

class ImageService {
  /**
   * Compress and save an image to GridFS
   * @param {Object} file - Multer file object containing buffer
   * @returns {Promise<Object>} The saved Image metadata document
   */
  async saveImage(file) {
    if (!gfsBucket) {
      throw new Error('Database connection not fully established for GridFS');
    }

    const originalName = file.originalname;
    let contentType = file.mimetype;
    let fileBuffer = file.buffer;

    // Compress using sharp if it's an image
    if (contentType && contentType.startsWith('image/')) {
      // Resize up to 1600x1600 while maintaining aspect ratio
      const imageProcessor = sharp(fileBuffer).resize(1600, 1600, {
        fit: 'inside',
        withoutEnlargement: true
      });

      if (contentType === 'image/png') {
        fileBuffer = await imageProcessor.png().toBuffer();
      } else {
        fileBuffer = await imageProcessor.jpeg({ quality: 80 }).toBuffer();
        contentType = 'image/jpeg';
      }
    }

    return new Promise((resolve, reject) => {
      // Create an upload stream to GridFS
      const uploadStream = gfsBucket.openUploadStream(originalName, {
        contentType: contentType
      });

      const gridFsId = uploadStream.id;

      uploadStream.on('error', (err) => {
        reject(err);
      });

      uploadStream.on('finish', async () => {
        try {
          // Lấy ID tự động tăng kiểu số (1, 2, 3...)
          const counter = await Counter.findByIdAndUpdate(
            { _id: 'images_sequence' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
          );

          // Once file is in GridFS, save the metadata in Image collection
          const imageRecord = new Image({
            _id: counter.seq,
            name: originalName,
            contentType,
            gridFsId
          });
          
          await imageRecord.save();
          resolve(imageRecord);
        } catch (dbError) {
          reject(dbError);
        }
      });

      // Write the buffer to the stream and end it
      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Get Download Stream from GridFS
   * @param {string} id - The metadata Image ID
   * @returns {Promise<{ stream: any, contentType: string }>}
   */
  async getImageStream(id) {
    const imageMeta = await Image.findById(id);
    if (!imageMeta || !imageMeta.gridFsId) {
      return null;
    }

    // Return the readable stream from GridFS
    const stream = gfsBucket.openDownloadStream(imageMeta.gridFsId);
    return {
      stream,
      contentType: imageMeta.contentType
    };
  }

  /**
   * Suggest images based on keyword match in filename
   * @param {string} keyword - Search keyword
   * @returns {Promise<Array>} Array of image metadata (id + name)
   */
  async suggestImages(keyword) {
    if (!keyword || keyword.trim().length === 0) return [];
    const regex = new RegExp(keyword.trim(), 'i');
    const results = await Image.find({ name: { $regex: regex } })
      .select('_id name contentType')
      .limit(10);
    return results.map(img => ({ id: img._id, name: img.name }));
  }
}

export default new ImageService();
