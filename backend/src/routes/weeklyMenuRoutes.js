import express from 'express';
import {
  getActiveWeeklyMenu,
  getWeeklyMenus,
  getWeeklyMenuById,
  createWeeklyMenu,
  updateWeeklyMenu,
  deleteWeeklyMenu
} from '../controllers/weeklyMenuController.js';
import { authorize } from "../security/SecurityMiddleware.js";

const router = express.Router();

// Public: Lấy Lịch Món Ăn đang Active
router.get('/active', getActiveWeeklyMenu);

// Admin: Quản trị Lịch
router.get('/', authorize(['admin', 'staff']), getWeeklyMenus);
router.get('/:id', authorize(['admin', 'staff']), getWeeklyMenuById);

router.post('/', authorize(['admin']), createWeeklyMenu);
router.put('/:id', authorize(['admin']), updateWeeklyMenu);
router.delete('/:id', authorize(['admin']), deleteWeeklyMenu);

export default router;
