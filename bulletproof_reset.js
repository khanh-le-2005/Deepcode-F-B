import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGO_URI = 'mongodb://127.0.0.1:27017/ordering-system';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const users = db.collection('users');

    // Wipe all
    await users.deleteMany({});
    console.log("Wiped all users");

    // Manually hash "123456"
    const hashedPassword = await bcrypt.hash('123456', 10);
    console.log("Generated hash for 123456:", hashedPassword);

    // Insert admin
    await users.insertOne({
      email: 'admin@gmail.com',
      password: hashedPassword,
      name: 'Quản trị viên',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log("Inserted admin@gmail.com");

    // Insert staff
    await users.insertOne({
      email: 'staff@gmail.com',
      password: hashedPassword,
      name: 'Nhân viên',
      role: 'staff',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log("Inserted staff@gmail.com");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
