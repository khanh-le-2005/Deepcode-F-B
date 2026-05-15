import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '../.env' });

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['available', 'unavailable'], default: 'available' }
}, { collection: 'menuitems' });

const comboSchema = new mongoose.Schema({
  name: { type: String, required: true }
}, { collection: 'combos' });

const MenuItem = mongoose.model('MenuItemTest', menuItemSchema);
const Combo = mongoose.model('ComboTest', comboSchema);

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordering-system';
    console.log('Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');
    
    const items = await MenuItem.find({}, '_id name');
    const combos = await Combo.find({}, '_id name');
    
    console.log('--- MENU ITEMS ---');
    items.forEach(i => console.log(`${i._id} - ${i.name}`));
    
    console.log('\n--- COMBOS ---');
    combos.forEach(c => console.log(`${c._id} - ${c.name}`));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

run();
