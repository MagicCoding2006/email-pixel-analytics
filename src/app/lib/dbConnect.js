// lib/dbConnect.js
import mongoose from 'mongoose';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://alexlotkov124:Cupworld1!@" +
  "cluster0.rgmqobn.mongodb.net/email_tracker" +
  "?retryWrites=true&w=majority&appName=Cluster0";

if (!MONGODB_URI) {
  throw new Error('Define MONGODB_URI in .env.local');
}

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
