import { Table } from "../models/Table.js";
import { User } from "../models/User.js";

const slugify = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
};

export async function seedInitialData() {
  try {
    const tableCount = await Table.countDocuments();
    if (tableCount === 0) {
      const initialTables = Array.from({ length: 12 }, (_, i) => ({
        name: `Bàn ${i + 1}`,
        slug: slugify(`Bàn ${i + 1}`),
        status: "empty"
      }));
      await Table.insertMany(initialTables);
      console.log("✅ Seeded initial tables");
    }

    const tablesMissingSlug = await Table.find({ $or: [{ slug: { $exists: false } }, { slug: '' }] });
    if (tablesMissingSlug.length > 0) {
      await Promise.all(tablesMissingSlug.map(t => (
        Table.findByIdAndUpdate(t._id, { slug: slugify(t.name) })
      )));
      console.log("✅ Backfilled table slugs");
    }

    // Tạm thời xóa hết user hiện tại (chưa được hash password)
    await User.deleteMany({});
    
    // Tìm đếm lại (giờ chắc chắn = 0)
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      // Dùng User.create thay vì insertMany để trigger method hooks .pre('save') ở file User.js
      await User.create([
        { email: "admin@gmail.com", password: "123456", role: "admin", name: "Quản trị viên" },
        { email: "staff@gmail.com", password: "123456", role: "staff", name: "Nhân viên" }
      ]);
      console.log("✅ Seeded initial users (with hashed passwords)");
    }
  } catch (err) {
    console.error("⚠️ Failed to seed initial data:", err.message);
  }
}
