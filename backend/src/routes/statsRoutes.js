import express from 'express';
import {
  getOverview,
  getRevenueChart,
  getTopItems,
  getKitchenPerformance
} from '../controllers/statsController.js';
import { authorize } from '../security/SecurityMiddleware.js';

const router = express.Router();

// Chỉ Admin và Staff mới có quyền truy cập thống kê
router.use(authorize(['admin', 'staff']));

router.get('/overview', getOverview);
router.get('/revenue-chart', getRevenueChart);
router.get('/top-items', getTopItems);
router.get('/kitchen-performance', getKitchenPerformance);

export default router;
