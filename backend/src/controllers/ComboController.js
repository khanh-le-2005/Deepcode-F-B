import ComboService from '../services/ComboService.js';
import ImageService from '../services/ImageService.js';
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
  let comboData = req.body;
  
  // Nếu client gửi JSON Text qua form-data với key "data"
  if (req.body.data && typeof req.body.data === 'string') {
    comboData = JSON.parse(req.body.data);
  }
  
  // Nếu client gửi file đính kèm, nén và lấy ID gắn vào comboData
  if (req.files && req.files.length > 0) {
    const imageIds = [];
    for (const file of req.files) {
      const savedImage = await ImageService.saveImage(file);
      imageIds.push(String(savedImage.id)); // CHỈ LƯU ID ẢNH
    }
    comboData.images = imageIds;
    if (imageIds.length > 0) {
      comboData.image = imageIds[0]; // Set ảnh đầu tiên làm ảnh bìa chính (image)
    }
  }

  const combo = await ComboService.createCombo(comboData);
  res.status(201).json(combo);
});

export const updateCombo = catchAsync(async (req, res) => {
  let comboData = req.body;
  
  if (req.body.data && typeof req.body.data === 'string') {
    comboData = JSON.parse(req.body.data);
  }
  
  // Nếu cập nhật kèm theo hình mới, sẽ ghi đè mảng hình cũ bằng các ID hình mới
  if (req.files && req.files.length > 0) {
    const imageIds = [];
    for (const file of req.files) {
      const savedImage = await ImageService.saveImage(file);
      imageIds.push(String(savedImage.id));
    }
    comboData.images = imageIds;
    if (imageIds.length > 0) {
      comboData.image = imageIds[0];
    }
  }

  const combo = await ComboService.updateCombo(req.params.id, comboData);
  res.json(combo);
});

export const deleteCombo = catchAsync(async (req, res) => {
  await ComboService.deleteCombo(req.params.id);
  res.json({ message: 'Combo deleted' });
});
