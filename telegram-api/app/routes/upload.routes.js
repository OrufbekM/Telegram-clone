const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/auth.middleware');


module.exports = app => {

  const uploadsDir = 'uploads/images';

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },

    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
    }

  });

  const fileFilter = (req, file, cb) => {

    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari ruxsat etilgan!'), false);
    }

  };
  
  const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter
    // No file size limits
  });
  
  app.post('/api/upload/image', [verifyToken], upload.single('image'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Rasm fayli topilmadi!' 
        });
      }
      const imageUrl = `/uploads/images/${req.file.filename}`;
      res.json({
        success: true,
        message: 'Rasm muvaffaqiyatli yuklandi!',
        data: {
          url: imageUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size
        }
      });
    } catch (error) {
      console.error('Rasm yuklashda xatolik:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server xatoligi!' 
      });
    }
  });
  app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      // Removed file size limit check
    }
    if (error.message === 'Faqat rasm fayllari ruxsat etilgan!') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  });
};

