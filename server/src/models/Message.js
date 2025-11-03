import mongoose from 'mongoose';

const ReactionSchema = new mongoose.Schema({
  emoji: String,
  userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const MessageSchema = new mongoose.Schema({
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  attachments: [{ type: String }],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: { type: [ReactionSchema], default: [] }
}, { timestamps: true });

export const Message = mongoose.model('Message', MessageSchema);
