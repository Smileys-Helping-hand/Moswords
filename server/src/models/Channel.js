import mongoose from 'mongoose';

const ChannelSchema = new mongoose.Schema({
  serverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Server', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['text', 'voice'], default: 'text' },
  category: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const Channel = mongoose.model('Channel', ChannelSchema);
