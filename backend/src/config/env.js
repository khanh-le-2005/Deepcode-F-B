import dotenv from 'dotenv';
dotenv.config();

export const env = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/ordering-system',
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  USE_IN_MEMORY: process.env.USE_IN_MEMORY || 'false',

};
