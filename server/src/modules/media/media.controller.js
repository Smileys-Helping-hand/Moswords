import AWS from 'aws-sdk';
import multer from 'multer';
import sharp from 'sharp';
import archiver from 'archiver';
import { v4 as uuid } from 'uuid';
import OpenAI from 'openai';
import { FileAsset } from '../../models/FileAsset.js';
import { env } from '../../config/env.js';

const s3 = new AWS.S3({
  accessKeyId: env.s3.accessKeyId,
  secretAccessKey: env.s3.secretAccessKey,
  region: env.s3.region,
  signatureVersion: 'v4'
});

const openai = env.openAiKey ? new OpenAI({ apiKey: env.openAiKey }) : null;

const memoryStorage = multer.memoryStorage();

export const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: env.uploads.maxFileSize
  }
});

const detectCategory = (mimeType = '') => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('msword') || mimeType.includes('sheet') || mimeType.includes('presentation')) {
    return 'document';
  }
  return 'other';
};

const getSignedUrl = async (key) => {
  return s3.getSignedUrlPromise('getObject', {
    Bucket: env.s3.bucket,
    Key: key,
    Expires: 60 * 60 // 1 hour
  });
};

const compressImage = async (buffer, mimeType, qualityPercent) => {
  const transformer = sharp(buffer);
  const quality = Math.min(100, Math.max(1, qualityPercent));

  if (mimeType === 'image/png') {
    return transformer.png({ quality });
  }

  if (mimeType === 'image/webp') {
    return transformer.webp({ quality });
  }

  return transformer.jpeg({ quality });
};

const maybeCompress = async ({ buffer, mimetype }, qualityMode, qualityPercent) => {
  if (qualityMode !== 'optimized' || !mimetype.startsWith('image/')) {
    return { buffer, mimeType: mimetype };
  }

  const pipeline = await compressImage(buffer, mimetype, qualityPercent);
  const outputBuffer = await pipeline.toBuffer();
  return { buffer: outputBuffer, mimeType: mimetype };
};

const maybeGenerateCaption = async (buffer, mimeType) => {
  if (!openai || !mimeType.startsWith('image/')) {
    return null;
  }

  try {
    const base64 = buffer.toString('base64');
    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: 'Provide a concise, accessible caption for this image in fewer than 30 words.' },
            { type: 'input_image', image_base64: base64 }
          ]
        }
      ]
    });

    const text = response.output_text?.trim();
    return text || null;
  } catch (error) {
    console.warn('Unable to generate caption', error.message);
    return null;
  }
};

const emitProgress = (req, payload) => {
  if (!req.io) return;
  const userId = req.user?.id || req.user?._id?.toString();
  req.io.to(`user:${userId}`).emit('file:progress', {
    userId,
    ...payload
  });
};

export const handleUpload = async (req, res) => {
  const {
    qualityMode = 'original',
    qualityPercent = '100',
    channelId = null,
    dmId = null,
    enableCaption = 'false'
  } = req.body;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files provided' });
  }

  const percent = Math.min(100, Math.max(10, Number.parseInt(qualityPercent, 10) || 100));
  const shouldCaption = enableCaption === 'true';

  const uploads = [];

  for (const file of req.files) {
    emitProgress(req, { fileName: file.originalname, status: 'processing', progress: 5 });
    const { buffer, mimeType } = await maybeCompress(file, qualityMode, percent);
    emitProgress(req, { fileName: file.originalname, status: 'uploading', progress: 15 });

    const storageKey = `uploads/${req.user.id}/${Date.now()}-${uuid()}-${file.originalname}`;
    const uploader = s3.upload({
      Bucket: env.s3.bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType
    });

    uploader.on('httpUploadProgress', (evt) => {
      const progress = evt.total ? Math.round((evt.loaded / evt.total) * 80) + 15 : 50;
      emitProgress(req, { fileName: file.originalname, status: 'uploading', progress: Math.min(progress, 95) });
    });

    await uploader.promise();
    emitProgress(req, { fileName: file.originalname, status: 'uploaded', progress: 100 });

    const fileCategory = detectCategory(mimeType);
    const caption = shouldCaption ? await maybeGenerateCaption(buffer, mimeType) : null;

    const record = await FileAsset.create({
      uploaderId: req.user._id,
      channelId: channelId || undefined,
      dmId: dmId || undefined,
      originalName: file.originalname,
      storageKey,
      mimeType,
      size: buffer.length,
      fileCategory,
      qualityMode,
      qualityPercent: percent,
      caption
    });

    const signedUrl = await getSignedUrl(storageKey);
    const json = record.toObject();
    json.url = signedUrl;
    json.uploaderId = record.uploaderId.toString();
    json.id = record.id;
    uploads.push(json);
  }

  return res.status(201).json({ files: uploads });
};

export const listFiles = async (req, res) => {
  const { channelId, dmId, type, mine } = req.query;
  const query = {};

  if (channelId) query.channelId = channelId;
  if (dmId) query.dmId = dmId;
  const mineQuery = typeof mine === 'string' ? mine.toLowerCase() : undefined;
  if (mineQuery === 'true' || (!mineQuery && !channelId && !dmId)) {
    query.uploaderId = req.user._id;
  }
  if (type && ['image', 'video', 'audio', 'document', 'other'].includes(type)) {
    query.fileCategory = type;
  }

  const files = await FileAsset.find(query).sort({ createdAt: -1 }).lean();
  const enriched = await Promise.all(files.map(async (file) => ({
    ...file,
    uploaderId: file.uploaderId?.toString(),
    id: file._id.toString(),
    url: await getSignedUrl(file.storageKey)
  })));

  return res.json({ files: enriched });
};

export const deleteFile = async (req, res) => {
  const { id } = req.params;
  const file = await FileAsset.findById(id);
  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }

  const isOwner = file.uploaderId.toString() === (req.user.id || req.user._id.toString());
  const isAdmin = Array.isArray(req.user.roles) && req.user.roles.includes('admin');

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'You do not have permission to delete this file.' });
  }

  await s3.deleteObject({ Bucket: env.s3.bucket, Key: file.storageKey }).promise();
  await file.deleteOne();

  return res.status(204).send();
};

export const downloadArchive = async (req, res) => {
  const { ids } = req.query;
  if (!ids) {
    return res.status(400).json({ message: 'ids query parameter is required' });
  }

  const fileIds = ids.split(',').filter(Boolean);
  const files = await FileAsset.find({ _id: { $in: fileIds } });

  if (!files.length) {
    return res.status(404).json({ message: 'No files found for download' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="moswords-files-${Date.now()}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (error) => {
    console.error('Archive error', error);
    res.status(500).end();
  });

  archive.pipe(res);

  await Promise.all(files.map(async (file) => {
    const stream = s3.getObject({ Bucket: env.s3.bucket, Key: file.storageKey }).createReadStream();
    const filename = file.originalName || file.storageKey.split('/').pop();
    archive.append(stream, { name: filename });
  }));

  await archive.finalize();
};
