import express from 'express';
import multer from 'multer';
import { 
  getMenuItems, 
  getMenuItemById, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem,
  getWeeklyMenuItems,
  getAdminMenuItems,
  publishWeekly,
  unpublishWeekly
} from '../controllers/menuController.js';
import { authorize } from '../security/SecurityMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/weekly', getWeeklyMenuItems);
router.get('/weekly-menu/active', getWeeklyMenuItems); // Alias for Doc v3.0
router.get('/admin/all', authorize(['admin', 'staff']), getAdminMenuItems);
router.patch('/publish-weekly', authorize(['admin']), publishWeekly);
router.patch('/:id/unpublish', authorize(['admin']), unpublishWeekly);

router.get('/', getMenuItems);
router.get('/:id', getMenuItemById);
router.post('/', authorize(['admin']), upload.array('images', 5), createMenuItem);
router.put('/:id', authorize(['admin']), upload.array('images', 5), updateMenuItem);
router.delete('/:id', authorize(['admin']), deleteMenuItem);

export default router;
