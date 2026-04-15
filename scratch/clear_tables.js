import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: `.env` });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ordering-system";

async function run() {
  console.log("Đang kết nối MongoDB để dọn dẹp Table:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  
  const db = mongoose.connection.db;

  try {
    await db.collection("tables").deleteMany({});
    console.log("✅ Đã dọn sạch toàn bộ Tables cũ để sửa lỗi trùng lặp slug (ba-n)");
    
    // Xóa index cũ để đảm bảo không bị cache lỗi
    try { await db.collection("tables").dropIndexes(); } catch(e){}

    console.log("Hệ thống sẽ tự động tạo lại 12 bàn chuẩn khi bạn khởi động lại Server.");
  } catch (error) {
    console.error("Lỗi xóa dữ liệu:", error);
  } finally {
    process.exit(0);
  }
}

run();
