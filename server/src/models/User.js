import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
  notifications: { type: Boolean, default: true }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatarUrl: { type: String },
  bio: { type: String, maxlength: 200 },
  status: { type: String, enum: ['online', 'offline', 'idle', 'dnd'], default: 'offline' },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blocked: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  servers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Server' }],
  roles: {
    type: [String],
    enum: ['member', 'moderator', 'admin'],
    default: ['member']
  },
  settings: { type: SettingsSchema, default: () => ({}) },
  lastSeenAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);
