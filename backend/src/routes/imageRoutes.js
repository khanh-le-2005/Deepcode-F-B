import express from 'express';
import multer from 'multer';
import * as imageController from '../controllers/ImageController.js';

const router = express.Router();
// Use memoryStorage because we need the raw buffer to compress via 'sharp' before streaming to DB
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), imageController.uploadImage);
router.get('/:id', imageController.getImage);

export default router;
