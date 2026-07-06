const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');

const storage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), env.UPLOAD_PATH, folder)),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = /\.(jpg|jpeg|png|webp|gif)$/i;
  if (!allowed.test(file.originalname)) return cb(new Error('Only image files are allowed'));
  cb(null, true);
};

const createUploader = (folder, maxCount = 5) => multer({
  storage: storage(folder),
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: imageFilter,
});

exports.productImages = createUploader('products').array('images', 5);
exports.categoryImage = createUploader('categories').single('image');
exports.profileImage = createUploader('profiles').single('avatar');

exports.handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};
