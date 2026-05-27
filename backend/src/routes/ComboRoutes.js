import express from 'express';
import multer from 'multer';
import * as comboController from '../controllers/ComboController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', comboController.getCombos);
router.get('/:id', comboController.getComboById);
router.post('/', upload.array('images', 5), comboController.createCombo);
router.put('/:id', upload.array('images', 5), comboController.updateCombo);
router.delete('/:id', comboController.deleteCombo);

export default router;
