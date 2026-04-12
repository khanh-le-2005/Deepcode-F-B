import express from 'express';
import multer from 'multer';
import * as imageController from '../controllers/ImageController.js';

const router = express.Router();
// Use memoryStorage because we need the raw buffer to compress via 'sharp' before streaming to DB
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), imageController.uploadImage);
// QUAN TRỌNG: Route cụ thể phải đứng TRƯỚC route động /:id
// Nếu không, Express sẽ hiểu "suggest" là một :id và gây lỗi 500
router.get('/suggest', imageController.suggestImages);
router.get('/:id', imageController.getImage);

export default router;
