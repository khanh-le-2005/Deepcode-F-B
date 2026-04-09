import mongoose from 'mongoose';
import { User } from './backend/src/models/User.js';

async function reset() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/ordering-system');
        console.log("Connected to ordering-system DB");
        
        // Delete all users to force a fresh state
        const del = await User.deleteMany({});
        console.log("Deleted", del.deletedCount, "users");
        
        // Create a plain-text admin
        const admin = await User.create({
            email: 'admin@gmail.com',
            password: '123456',
            name: 'Quản trị viên',
            role: 'admin'
        });
        console.log("Created plain-text admin:", admin.email);

        // Create a plain-text staff
        const staff = await User.create({
            email: 'staff@gmail.com',
            password: '123456',
            name: 'Nhân viên',
            role: 'staff'
        });
        console.log("Created plain-text staff:", staff.email);
        
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

reset();
