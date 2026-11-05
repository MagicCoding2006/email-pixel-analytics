// lib/dbConnect.js
import mongoose from 'mongoose';

const TRACKER_URI =
  process.env.MONGODB_TRACKER_URI ||
  "mongodb+srv://alexlotkov124:Cupworld1!@cluster0.rgmqobn.mongodb.net/email_tracker?retryWrites=true&w=majority";
const META_URI =
  process.env.MONGODB_META_URI ||
  "mongodb+srv://alexlotkov124:Cupworld1!@cluster0.rgmqobn.mongodb.net/email_db?retryWrites=true&w=majority";

const cache = global._mongoConnectionPromises || (global._mongoConnectionPromises = {});

function getDb(key, uri) {
  if (!cache[key]) {
    cache[key] = mongoose.createConnection(uri, {
      bufferCommands: false,
    }).asPromise().then(connection => {
      console.log(`[dbConnect] ${key} DB:`, connection.name);
      return connection;
    }).catch(error => {
      // Allow the next request to retry a failed initial connection.
      delete cache[key];
      throw error;
    });
  }

  return cache[key];
}

export async function getTrackerDb() {
  return getDb('tracker', TRACKER_URI);
}

export async function getMetaDb() {
  return getDb('meta', META_URI);
}
