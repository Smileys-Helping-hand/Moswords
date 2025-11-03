import mongoose from 'mongoose';

const FileAssetSchema = new mongoose.Schema({
  uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
  dmId: { type: mongoose.Schema.Types.ObjectId },
  originalName: { type: String, required: true },
  storageKey: { type: String, required: true, index: true },
  mimeType: { type: String },
  size: { type: Number, required: true },
  fileCategory: { type: String, enum: ['image', 'video', 'audio', 'document', 'other'], default: 'other' },
  qualityMode: { type: String, enum: ['original', 'optimized'], default: 'original' },
  qualityPercent: { type: Number, min: 1, max: 100, default: 100 },
  caption: { type: String }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

FileAssetSchema.virtual('url');

FileAssetSchema.index({ channelId: 1, createdAt: -1 });
FileAssetSchema.index({ dmId: 1, createdAt: -1 });
FileAssetSchema.index({ uploaderId: 1, createdAt: -1 });

export const FileAsset = mongoose.model('FileAsset', FileAssetSchema);
