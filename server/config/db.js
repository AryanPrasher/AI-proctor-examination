import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dns from 'dns';

// Fix Windows DNS SRV lookup failure for MongoDB Atlas
if (process.platform === 'win32') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (e) {
    // Ignore DNS override errors
  }
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri && process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: MONGODB_URI environment variable is missing on production!');
  }
  
  try {
    const targetUri = uri || 'mongodb://localhost:27017/ai-proctor-adaptive';
    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`Standard MongoDB connection failed: ${error.message}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log('Starting In-Memory MongoDB Server fallback...');
      try {
        mongod = await MongoMemoryServer.create();
        const memUri = mongod.getUri();
        const conn = await mongoose.connect(memUri);
        console.log(`In-Memory MongoDB Connected: ${conn.connection.host}`);
      } catch (memError) {
        console.error(`In-Memory MongoDB failed to start: ${memError.message}`);
      }
    } else {
      console.error('Please configure MONGODB_URI in Render Environment Variables.');
    }
  }
};

export default connectDB;
