import CategoryService from '../services/CategoryService.js';
import ImageService from '../services/ImageService.js';
import { catchAsync } from "../utils/catchAsync.js";

export const getCategories = catchAsync(async (req, res) => {
  const categories = await CategoryService.getCategories();
  res.json(categories);
});

export const getCategoryById = catchAsync(async (req, res) => {
  const category = await CategoryService.getCategoryById(req.params.id);
  res.json(category);
});

export const createCategory = catchAsync(async (req, res) => {
  let categoryData = req.body;
  
  if (req.body.data && typeof req.body.data === 'string') {
    categoryData = JSON.parse(req.body.data);
  }
  
  if (req.file) {
    const savedImage = await ImageService.saveImage(req.file);
    categoryData.image = savedImage.id;
  }

  const category = await CategoryService.createCategory(categoryData, req.io);
  res.status(201).json(category);
});

export const updateCategory = catchAsync(async (req, res) => {
  let categoryData = req.body;
  
  if (req.body.data && typeof req.body.data === 'string') {
    categoryData = JSON.parse(req.body.data);
  }
  
  if (req.file) {
    const savedImage = await ImageService.saveImage(req.file);
    categoryData.image = savedImage.id;
  }

  const category = await CategoryService.updateCategory(req.params.id, categoryData, req.io);
  res.json(category);
});

export const deleteCategory = catchAsync(async (req, res) => {
  const category = await CategoryService.deleteCategory(req.params.id, req.io);
  res.json({ message: 'Category deleted', category });
});
