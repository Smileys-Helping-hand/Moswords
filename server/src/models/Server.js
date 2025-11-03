import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  permissions: [{ type: String, required: true }]
}, { _id: false });

const ServerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  roles: { type: [RoleSchema], default: [] },
  invites: [{ code: String, expiresAt: Date }]
}, { timestamps: true });

export const Server = mongoose.model('Server', ServerSchema);
