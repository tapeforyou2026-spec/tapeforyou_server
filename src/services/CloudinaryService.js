const cloudinary = require('../config/cloudinary');

// Product images only, per explicit request — every other upload (hero
// slides, categories, about page, etc.) still goes through the existing
// local-disk multer storage in middlewares/upload.js, untouched.

// multer's memoryStorage gives a Buffer (no temp file on disk) — the
// Cloudinary Node SDK has no plain buffer-upload method, only a writable
// stream via upload_stream, so this wraps that in a Promise.
function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// Used when an admin deletes a product image — without this, "delete" only
// ever removed the DB row and left the asset (and its storage usage) behind
// on Cloudinary forever.
function destroy(publicId) {
  if (!publicId) return Promise.resolve();
  return cloudinary.uploader.destroy(publicId);
}

module.exports = { uploadBuffer, destroy };
