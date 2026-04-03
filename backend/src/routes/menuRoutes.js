import express from 'express';
import multer from 'multer';
import { getMenuItems, getMenuItemById, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/menuController.js';
import { authorize } from '../security/SecurityMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getMenuItems);
router.get('/:id', getMenuItemById);
router.post('/', authorize(['admin']), upload.array('images', 5), createMenuItem);
router.put('/:id', authorize(['admin']), upload.array('images', 5), updateMenuItem);
router.delete('/:id', authorize(['admin']), deleteMenuItem);

export default router;
