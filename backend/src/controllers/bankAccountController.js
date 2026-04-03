import BankAccountService from "../services/BankAccountService.js";
import { catchAsync } from "../utils/catchAsync.js";
import { NotFoundError } from "../utils/AppError.js";

export const createBankAccount = catchAsync(async (req, res) => {
  const account = await BankAccountService.createAccount(req.body);
  res.status(201).json({ message: "Thêm tài khoản thành công", account });
});

export const getBankAccounts = catchAsync(async (req, res) => {
  const accounts = await BankAccountService.getAllAccounts();
  res.json(accounts);
});

export const getDefaultBankAccount = catchAsync(async (req, res) => {
  const account = await BankAccountService.getDefaultAccount();
  if (!account) {
    throw new NotFoundError("Chưa có tài khoản mặc định nào được thiết lập");
  }
  res.json(account);
});

export const updateBankAccount = catchAsync(async (req, res) => {
  const account = await BankAccountService.updateAccount(
    req.params.id,
    req.body,
  );
  res.json({ message: "Cập nhật thành công", account });
});

export const deleteBankAccount = catchAsync(async (req, res) => {
  await BankAccountService.deleteAccount(req.params.id);
  res.json({ message: "Đã xóa tài khoản ngân hàng" });
});
