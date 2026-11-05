// models/Email.js
import mongoose from 'mongoose';

const EmailSchema = new mongoose.Schema({
  _id:       { type: String, required: true },
  email:     { type: String, required: true },
  subject:   { type: String, required: true },
  html:      { type: String },
  created_at: { type: Date },
  send_status: { type: String, enum: ['draft', 'sent'] },
  sent_at:   { type: Date },
  events: [{
    event:       String,
    id:          String,
    pixel_id:    String,
    subject:     String,
    ip:          String,
    user_agent:  String,
    timestamp:   Date,
    open_count:  Number,
    bot_preload: Boolean
  }]
}, { collection: 'emails' });

export default mongoose.models.Email
  ? mongoose.models.Email
  : mongoose.model('Email', EmailSchema);
