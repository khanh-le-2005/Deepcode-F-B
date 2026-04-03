import express from 'express';
import multer from 'multer';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { authorize } from "../security/SecurityMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Thao tác chỉnh sửa yêu cầu quyền quản trị có upload ảnh (single image: "image")
router.post('/', authorize(['admin']), upload.single('image'), createCategory);
router.put('/:id', authorize(['admin']), upload.single('image'), updateCategory);
router.delete('/:id', authorize(['admin']), deleteCategory);

export default router;
