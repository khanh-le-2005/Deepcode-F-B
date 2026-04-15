import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: `.env` });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ordering-system";

async function run() {
  console.log("Đang kết nối MongoDB để dọn dẹp:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  
  // Dọn dẹp collection orders và payments
  const db = mongoose.connection.db;

  try {
    await db.collection("orders").deleteMany({});
    console.log("✅ Đã dọn sạch toàn bộ Bill / Orders cũ cản trở thuộc tính orderCode");
    
    await db.collection("payments").deleteMany({});
    console.log("✅ Đã xóa toàn bộ Lịch sử Payments cũ");

    // Xóa collection nếu có cấu trúc index cứng (để chắc chắn trigger lại auto index của Mongoose)
    try { await db.collection("orders").dropIndexes(); } catch(e){}
    try { await db.collection("payments").dropIndexes(); } catch(e){}

    console.log("CHÚC MỪNG BẠN ĐÃ RESET THÀNH CÔNG! HỆ THỐNG SẴN SÀNG CHO PAYOS.");
  } catch (error) {
    console.error("Lỗi xóa dữ liệu:", error);
  } finally {
    process.exit(0);
  }
}

run();
