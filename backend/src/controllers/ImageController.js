import ImageService from '../services/ImageService.js';
import { catchAsync } from "../utils/catchAsync.js";
import { NotFoundError, BadRequestError } from "../utils/AppError.js";

export const uploadImage = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new BadRequestError('No file uploaded');
  }

  const savedImage = await ImageService.saveImage(req.file);
  
  return res.status(200).json({
    status: 200,
    data: savedImage.id, // This is the ID to save in the MenuItem
    message: 'Upload image successful'
  });
});

export const getImage = catchAsync(async (req, res) => {
  const result = await ImageService.getImageStream(req.params.id);
  if (!result) {
    throw new NotFoundError('Image not found');
  }

  // Set cache headers properly for browser performance (1 year cache)
  res.set({
    'Content-Type': result.contentType,
    'Cache-Control': 'public, max-age=31536000'
  });

  // Pipe the gridFS stream directly to the Express response
  result.stream.pipe(res);
  
  result.stream.on('error', (err) => {
    res.status(500).json({ success: false, error: { message: "Error reading image stream" } });
  });
});
