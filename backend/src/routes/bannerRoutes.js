import express from 'express';
import multer from 'multer';
import * as bannerController from '../controllers/BannerController.js';
import { authorize } from '../security/SecurityMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public endpoints
router.get('/', bannerController.getBanners);
router.get('/active', bannerController.getActiveBanners);
router.get('/:id', bannerController.getBannerById);

// Admin-only endpoints
router.post('/', authorize(['admin']), upload.single('image'), bannerController.createBanner);
router.put('/:id', authorize(['admin']), upload.single('image'), bannerController.updateBanner);
router.delete('/:id', authorize(['admin']), bannerController.deleteBanner);

export default router;
