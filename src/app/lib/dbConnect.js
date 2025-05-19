// lib/dbConnect.js
import mongoose from 'mongoose';

const TRACKER_URI =
  process.env.MONGODB_TRACKER_URI ||
  "mongodb+srv://alexlotkov124:Cupworld1!@cluster0.rgmqobn.mongodb.net/email_tracker?retryWrites=true&w=majority";
const META_URI =
  process.env.MONGODB_META_URI ||
  "mongodb+srv://alexlotkov124:Cupworld1!@cluster0.rgmqobn.mongodb.net/email_db?retryWrites=true&w=majority";

let cache = global._mongoConns || (global._mongoConns = {});

export async function getTrackerDb() {
  if (cache.tracker) return cache.tracker;
  cache.tracker = await mongoose.createConnection(TRACKER_URI, {
    bufferCommands: false,
  });
  console.log("[dbConnect] tracker DB:", cache.tracker.name);
  return cache.tracker;
}

export async function getMetaDb() {
  if (cache.meta) return cache.meta;
  cache.meta = await mongoose.createConnection(META_URI, {
    bufferCommands: false,
  });
  console.log("[dbConnect] meta DB:", cache.meta.name);
  return cache.meta;
}
