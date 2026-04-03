export class AppError extends Error {
  constructor(message, statusCode, errorCode = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode; // Mã lỗi nội bộ để Frontend dễ dịch đa ngôn ngữ
    this.isOperational = true; // Đánh dấu đây là lỗi do nghiệp vụ (không phải bug code)

    Error.captureStackTrace(this, this.constructor);
  }
}

// Các class tiện ích cụ thể
export class NotFoundError extends AppError {
  constructor(message = "Tài nguyên không tồn tại") {
    super(message, 404, "NOT_FOUND");
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Dữ liệu không hợp lệ") {
    super(message, 400, "BAD_REQUEST");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Chưa xác thực") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Dịch vụ không khả dụng", errorCode = "SERVICE_UNAVAILABLE") {
    super(message, 503, errorCode);
  }
}
