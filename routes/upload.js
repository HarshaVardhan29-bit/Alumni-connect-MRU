/**
 * File Upload Route — Cloudinary
 * 
 * Flow: Frontend → POST /api/upload/sign → get signed URL
 *       Frontend → direct upload to Cloudinary
 *       Frontend → POST message with returned URL
 * 
 * This keeps large files off our server entirely.
 * Fallback: if no Cloudinary, accept base64 for small files only.
 */

const router      = require('express').Router();
const { protect } = require('../middleware/auth');
const crypto      = require('crypto');

const CLOUDINARY_CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_KEY   = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_SECRET = process.env.CLOUDINARY_API_SECRET;

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'application/zip',
];

const MAX_SIZE = {
  image: 10 * 1024 * 1024,  // 10MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 20 * 1024 * 1024,  // 20MB
  file:  50 * 1024 * 1024,  // 50MB
};

// POST /api/upload/sign — get Cloudinary signed upload params
router.post('/sign', protect, async (req, res) => {
  try {
    if (!CLOUDINARY_CLOUD || !CLOUDINARY_KEY || !CLOUDINARY_SECRET) {
      return res.status(503).json({ message: 'File upload not configured. Use base64 fallback.' });
    }

    const { mimeType, fileSize, fileType } = req.body;

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return res.status(400).json({ message: `File type ${mimeType} not allowed` });
    }

    // Validate file size
    const category = mimeType.startsWith('image/') ? 'image'
                   : mimeType.startsWith('video/') ? 'video'
                   : mimeType.startsWith('audio/') ? 'audio'
                   : 'file';

    if (fileSize > MAX_SIZE[category]) {
      return res.status(400).json({ message: `File too large. Max ${MAX_SIZE[category] / 1024 / 1024}MB for ${category}` });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder    = `alumni-network/${req.user._id}/${category}s`;
    const publicId  = `${folder}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Generate signature
    const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_SECRET}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    res.json({
      cloudName:  CLOUDINARY_CLOUD,
      apiKey:     CLOUDINARY_KEY,
      timestamp,
      signature,
      folder,
      publicId,
      uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${category === 'image' ? 'image' : category === 'video' ? 'video' : 'raw'}/upload`,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
