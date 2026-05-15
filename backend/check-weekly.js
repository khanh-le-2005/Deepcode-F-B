import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordering-system';
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');
    
    const weeklyMenu = await mongoose.connection.db.collection('weeklymenus').findOne({ status: 'active' });
    console.log('--- ACTIVE WEEKLY MENU ---');
    console.log(JSON.stringify(weeklyMenu, null, 2));
    
    if (weeklyMenu && weeklyMenu.menuItems) {
      console.log('\n--- CHECKING ITEMS IN MENU ---');
      for (const idStr of weeklyMenu.menuItems) {
        const item = await mongoose.connection.db.collection('menuitems').findOne({ _id: new mongoose.Types.ObjectId(idStr) });
        console.log(`ID: ${idStr} -> Found in menuitems: ${!!item}`);
        if (item) console.log(`   Name: ${item.name}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

run();
