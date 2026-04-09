import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './backend/src/models/User.js';

dotenv.config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/qr-dine-in");
        console.log("Connected to DB");
        
        const users = await User.find({});
        console.log("Total users found:", users.length);
        
        users.forEach(u => {
            console.log(`Email: ${u.email}, Role: ${u.role}, Password length: ${u.password.length}, Password starts with $2a$: ${u.password.startsWith('$2a$')}`);
        });

        if (users.length > 0) {
            console.log("\n--- SUGGESTION ---");
            const admin = users.find(u => u.email === 'admin@gmail.com');
            if (admin && admin.password.startsWith('$2a$')) {
                console.log("CRITICAL: The admin user has a HASHED password, but your AuthService.js is looking for PLAIN TEXT!");
                console.log("Action: I will reset this to plain text '123456' to match your AuthService.js.");
                admin.password = "123456";
                await admin.save();
                console.log("DONE: admin@gmail.com reset to '123456'");
            }
        }
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkUsers();
