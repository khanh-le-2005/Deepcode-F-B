import TableService from '../services/TableService.js';
import { catchAsync } from "../utils/catchAsync.js";

export const getTables = catchAsync(async (req, res) => {
  const tables = await TableService.getTables();
  res.json(tables);
});

export const createTable = catchAsync(async (req, res) => {
  const table = await TableService.createTable(req.body);
  req.io.emit("tables-updated", await TableService.getTables());
  res.status(201).json(table);
});

export const updateTable = catchAsync(async (req, res) => {
  const table = await TableService.updateTable(req.params.id, req.body);
  req.io.emit("tables-updated", await TableService.getTables());
  res.json(table);
});

export const deleteTable = catchAsync(async (req, res) => {
  await TableService.deleteTable(req.params.id);
  req.io.emit("tables-updated", await TableService.getTables());
  res.json({ message: 'Table deleted' });
});
