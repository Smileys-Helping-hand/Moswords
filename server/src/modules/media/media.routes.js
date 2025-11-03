import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { upload, handleUpload, listFiles, deleteFile, downloadArchive } from './media.controller.js';

const router = Router();

router.get('/', authenticate, listFiles);
router.get('/download', authenticate, downloadArchive);
router.post('/upload', authenticate, upload.array('files'), handleUpload);
router.delete('/:id', authenticate, deleteFile);

export default router;
