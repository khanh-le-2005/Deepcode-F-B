import express from 'express';
import { getStats } from '../controllers/statsController.js';
import { authorize } from '../security/SecurityMiddleware.js';

const router = express.Router();

router.get('/', authorize(['admin', 'staff']), getStats);

export default router;
