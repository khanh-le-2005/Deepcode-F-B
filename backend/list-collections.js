import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordering-system';
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('--- COLLECTIONS ---');
    collections.forEach(c => console.log(c.name));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

run();
