// models/BankAccount.js
import mongoose from "mongoose";
import { globalSchemaOptions } from "../utils/schemaOptions.js";

const bankAccountSchema = new mongoose.Schema(
  {
    bankName: { type: String, required: true },
    bin: { type: String, required: true },
    accountNo: { type: String, required: true },
    accountName: { type: String, required: true },

    // Thêm 2 trường này cho Python
    phone: { type: String, required: true },
    password: { type: String, required: true },

    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  globalSchemaOptions,
);

export const BankAccount = mongoose.model("BankAccount", bankAccountSchema);
