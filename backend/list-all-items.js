import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordering-system';
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');
    
    const items = await mongoose.connection.db.collection('menuitems').find({}).toArray();
    console.log('--- ALL MENU ITEMS ---');
    if (items.length === 0) console.log('(No items found)');
    items.forEach(i => console.log(`${i._id} - ${i.name}`));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

run();
