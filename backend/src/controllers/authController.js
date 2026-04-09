import AuthService from '../security/AuthService.js';
import { catchAsync } from "../utils/catchAsync.js";
import { BadRequestError } from "../utils/AppError.js";

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new BadRequestError('Email và mật khẩu không được để trống');
  }
  
  const result = await AuthService.authenticateUser(email, password);
  
  res.json({
    success: true,
    user: result.user,
    token: result.token,
    refreshToken: result.refreshToken,
  });
});

export const refresh = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new BadRequestError('refreshToken không được để trống');
  }

  const result = await AuthService.refreshAccessToken(refreshToken);

  res.json({
    success: true,
    token: result.token,
    refreshToken: result.refreshToken,
  });
});
