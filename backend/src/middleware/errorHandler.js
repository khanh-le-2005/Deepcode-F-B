export const globalErrorHandler = (err, req, res, next) => {
  // Handle Zod validation errors specifically
  if (err.name === "ZodError" || err.isZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu không hợp lệ",
        details: err.errors ? err.errors.map(e => ({ path: e.path, message: e.message })) : undefined
      }
    });
  }

  err.statusCode = err.statusCode || 500;
  err.errorCode = err.errorCode || "INTERNAL_SERVER_ERROR";

  // Format trả về chuẩn cho Frontend
  const errorResponse = {
    success: false,
    error: {
      code: err.errorCode,
      message: err.message,
    },
  };

  // Nếu đang ở môi trường DEV, in thêm chi tiết để dễ debug
  if (process.env.NODE_ENV === "development") {
    errorResponse.error.stack = err.stack;
    console.error(`[ERROR] ${req.method} ${req.originalUrl} >>`, err.message);
  }

  res.status(err.statusCode).json(errorResponse);
};
