import ComboService from '../services/ComboService.js';
import { catchAsync } from "../utils/catchAsync.js";

export const getCombos = catchAsync(async (req, res) => {
  const combos = await ComboService.getCombos();
  res.json(combos);
});

export const getComboById = catchAsync(async (req, res) => {
  const combo = await ComboService.getComboById(req.params.id);
  res.json(combo);
});

export const createCombo = catchAsync(async (req, res) => {
  const combo = await ComboService.createCombo(req.body);
  res.status(201).json(combo);
});

export const updateCombo = catchAsync(async (req, res) => {
  const combo = await ComboService.updateCombo(req.params.id, req.body);
  res.json(combo);
});

export const deleteCombo = catchAsync(async (req, res) => {
  await ComboService.deleteCombo(req.params.id);
  res.json({ message: 'Combo deleted' });
});
