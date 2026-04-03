import StatsService from '../services/StatsService.js';
import { catchAsync } from "../utils/catchAsync.js";

export const getStats = catchAsync(async (req, res) => {
  const stats = await StatsService.getStats();
  res.json(stats);
});
