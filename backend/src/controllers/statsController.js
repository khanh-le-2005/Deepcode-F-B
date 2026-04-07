import StatsService from '../services/StatsService.js';
import { catchAsync } from "../utils/catchAsync.js";

// Lấy tham số startDate, endDate chung
const getDates = (req) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(startDate) : new Date();
  if (!startDate) start.setHours(0, 0, 0, 0); // Mặc định hôm nay
  
  const end = endDate ? new Date(endDate) : new Date();
  if (endDate) {
    end.setHours(23, 59, 59, 999);
  } else {
    end.setHours(23, 59, 59, 999);
  }
  return { start, end };
};

export const getOverview = catchAsync(async (req, res) => {
  const { start, end } = getDates(req);
  const data = await StatsService.getOverview(start, end);
  res.json({ success: true, data });
});

export const getRevenueChart = catchAsync(async (req, res) => {
  const { start, end } = getDates(req);
  const groupBy = req.query.groupBy || 'day';
  const data = await StatsService.getRevenueChart(start, end, groupBy);
  res.json({ success: true, data });
});

export const getTopItems = catchAsync(async (req, res) => {
  const { start, end } = getDates(req);
  const limit = parseInt(req.query.limit) || 10;
  const data = await StatsService.getTopItems(start, end, limit);
  res.json({ success: true, data });
});

export const getKitchenPerformance = catchAsync(async (req, res) => {
  const { start, end } = getDates(req);
  const data = await StatsService.getKitchenPerformance(start, end);
  res.json({ success: true, data });
});
