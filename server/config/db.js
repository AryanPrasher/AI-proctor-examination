import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dns from 'dns';

// Fix Windows DNS SRV lookup failure for MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore DNS override errors
}

const connectDB = async () => {
  try {
    const localUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-proctor-adaptive';
    const conn = await mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`Standard MongoDB connection failed: ${error.message}`);
    console.log('Starting In-Memory MongoDB Server fallback...');
    try {
      mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`In-Memory MongoDB Connected: ${conn.connection.host}`);
    } catch (memError) {
      console.error(`In-Memory MongoDB failed to start: ${memError.message}`);
      process.exit(1);
    }
  }
};

export default connectDB;
