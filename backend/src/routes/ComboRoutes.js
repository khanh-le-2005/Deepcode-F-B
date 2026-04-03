import express from 'express';
import * as comboController from '../controllers/ComboController.js';

const router = express.Router();

router.get('/', comboController.getCombos);
router.get('/:id', comboController.getComboById);
router.post('/', comboController.createCombo);
router.put('/:id', comboController.updateCombo);
router.delete('/:id', comboController.deleteCombo);

export default router;
