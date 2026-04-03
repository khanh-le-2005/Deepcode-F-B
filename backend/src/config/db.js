import mongoose from 'mongoose';
import { env } from './env.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

export async function connectDB() {
  try {
    let uri = env.MONGODB_URI;

    const useInMemory = !uri || env.USE_IN_MEMORY === 'true';
    if (useInMemory) {
      console.log('⏳ Starting in-memory MongoDB...');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
    } else {
      console.log('⏳ Connecting to REAL MongoDB...');
    }
    
    // Disable buffering so if connection fails, queries fail immediately instead of hanging
    mongoose.set('bufferCommands', false);
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // Fail fast if no connection
    });
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.error('Please ensure MONGODB_URI is a valid cloud connection string (e.g., MongoDB Atlas) in the Secrets panel.');
  }
}
