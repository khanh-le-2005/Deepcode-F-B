import AuthService from "../security/AuthService.js";
import { catchAsync } from "../utils/catchAsync.js";
import { BadRequestError } from "../utils/AppError.js";

// Cấu hình cookie siêu bảo mật
const cookieOptions = {
  httpOnly: true, // Chống XSS (JS frontend không đọc được)
  secure: process.env.NODE_ENV === "production", // Chỉ gửi qua HTTPS khi ở production
  sameSite: "strict", // Chống CSRF
  maxAge: 24 * 60 * 60 * 1000, // 1 ngày
};

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new BadRequestError("Email và mật khẩu không được để trống");
  }

  const result = await AuthService.authenticateUser(email, password);

  // Set refresh token vào Http-Only Cookie
  res.cookie("refreshToken", result.refreshToken, cookieOptions);

  res.json({
    success: true,
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken, // Trả thêm về body cho dễ test Postman
  });
});

export const refreshToken = catchAsync(async (req, res) => {
  // Lấy refresh token từ cookie
  const oldRefreshToken = req.cookies.refreshToken;

  const { newAccessToken, newRefreshToken } =
    await AuthService.refreshAccessToken(oldRefreshToken);

  // Set lại cookie mới
  res.cookie("refreshToken", newRefreshToken, cookieOptions);

  res.json({
    success: true,
    accessToken: newAccessToken,
  });
});

export const logout = catchAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  await AuthService.logoutUser(refreshToken);

  // Xoá cookie
  res.clearCookie("refreshToken", cookieOptions);

  res.json({ success: true, message: "Đăng xuất thành công" });
});
