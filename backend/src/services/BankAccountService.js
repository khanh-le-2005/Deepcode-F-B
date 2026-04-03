// services/BankAccountService.js
import { BankAccount } from "../models/BankAccount.js";
import paymentGateway from "../utils/paymentGatewayClient.js";
import { NotFoundError } from "../utils/AppError.js";

class BankAccountService {
  // Hàm phụ trợ map data gửi sang Python
  _mapToPythonPayload(account) {
    return {
      id: account._id.toString(), // Gửi ID của Node sang để Python dễ mapping
      phone: account.phone,
      password: account.password,
      account_number: account.accountNo,
      account_name: account.accountName,
      status: account.isDefault ? "active" : "inactive",
    };
  }

  async createAccount(data) {
    if (data.isDefault) await BankAccount.updateMany({}, { isDefault: false });
    const account = new BankAccount(data);
    await account.save();

    // Gọi sang Python Thêm mới
    try {
      await paymentGateway.post(
        "/add-bank-account/",
        this._mapToPythonPayload(account),
      );
    } catch (err) {
      console.error("Lỗi đồng bộ Create sang Python:", err.message);
    }
    return account;
  }

  async getAllAccounts() {
    return await BankAccount.find().sort({ createdAt: -1 });
  }

  async getDefaultAccount() {
    return await BankAccount.findOne({ isDefault: true, isActive: true });
  }

  async updateAccount(id, data) {
    if (data.isDefault)
      await BankAccount.updateMany({ _id: { $ne: id } }, { isDefault: false });
    const account = await BankAccount.findByIdAndUpdate(id, data, {
      new: true,
    });
    if (!account) throw new NotFoundError("Không tìm thấy tài khoản ngân hàng");

    // Gọi sang Python Cập nhật
    try {
      await paymentGateway.put(
        `/update-bank-account/${id}`,
        this._mapToPythonPayload(account),
      );
    } catch (err) {
      console.error("Lỗi đồng bộ Update sang Python:", err.message);
    }
    return account;
  }

  async deleteAccount(id) {
    const account = await BankAccount.findByIdAndDelete(id);
    if (!account) throw new NotFoundError("Không tìm thấy tài khoản ngân hàng");

    // Gọi sang Python Xóa
    try {
      await paymentGateway.delete(`/delete-bank-account/${id}`);
    } catch (err) {
      console.error("Lỗi đồng bộ Delete sang Python:", err.message);
    }
    return true;
  }
}

export default new BankAccountService();
