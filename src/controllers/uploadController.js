const multer = require('multer');
const fileUtils = require('../utils/fileUtils');
const { User, ActivityLog } = require('../models');
const config = require('../config');
const logger = require('../config/logger');
const { AppError, catchAsync } = require('../middlewares/errorHandler');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
    files: config.MAX_FILES_PER_UPLOAD
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
  }
});

/**
 * Upload coupon image
 */
const uploadCouponImage = catchAsync(async (req, res) => {
  const user = req.user;
  
  if (!req.file) {
    throw new AppError('No file provided', 400, 'NO_FILE');
  }

  const fileData = await fileUtils.saveFile(req.file, 'coupon', user._id, {
    width: 1024,
    height: 1024,
    quality: 85
  });

  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'file_uploaded',
    details: {
      fileType: 'coupon_image',
      filename: fileData.filename,
      size: fileData.size
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  logger.audit('Coupon image uploaded', {
    userId: user._id,
    filename: fileData.filename,
    size: fileData.size
  });

  res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    data: {
      file: fileData
    }
  });
});

/**
 * Upload user avatar
 */
const uploadAvatar = catchAsync(async (req, res) => {
  const user = req.user;
  
  if (!req.file) {
    throw new AppError('No file provided', 400, 'NO_FILE');
  }

  const fileData = await fileUtils.saveFile(req.file, 'avatar', user._id, {
    width: 512,
    height: 512,
    quality: 90,
    fit: 'cover'
  });

  // Update user avatar
  user.profile.avatar = fileData.url;
  await user.save();

  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'avatar_updated',
    details: {
      filename: fileData.filename,
      size: fileData.size
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  logger.audit('Avatar updated', {
    userId: user._id,
    filename: fileData.filename,
    size: fileData.size
  });

  res.json({
    success: true,
    message: 'Avatar updated successfully',
    data: {
      file: fileData,
      user: user.toPublicJSON()
    }
  });
});

/**
 * Bulk file upload (for multiple coupon images)
 */
const uploadBulk = catchAsync(async (req, res) => {
  const user = req.user;
  
  if (!req.files || req.files.length === 0) {
    throw new AppError('No files provided', 400, 'NO_FILES');
  }

  if (req.files.length > config.MAX_FILES_PER_UPLOAD) {
    throw new AppError(
      `Too many files. Maximum ${config.MAX_FILES_PER_UPLOAD} files allowed`,
      400,
      'TOO_MANY_FILES'
    );
  }

  const { results, errors } = await fileUtils.saveFiles(req.files, 'coupon', user._id);

  // Log activity for successful uploads
  if (results.length > 0) {
    await ActivityLog.logActivity({
      user: user._id,
      action: 'bulk_upload',
      details: {
        fileCount: results.length,
        totalSize: results.reduce((sum, file) => sum + file.size, 0),
        errorCount: errors.length
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  logger.audit('Bulk upload completed', {
    userId: user._id,
    successCount: results.length,
    errorCount: errors.length
  });

  res.status(results.length > 0 ? 201 : 400).json({
    success: results.length > 0,
    message: `${results.length} files uploaded successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
    data: {
      files: results,
      errors: errors
    }
  });
});

/**
 * Delete uploaded file
 */
const deleteFile = catchAsync(async (req, res) => {
  const user = req.user;
  const { fileType, fileId } = req.params;

  if (!['coupon-image', 'avatar'].includes(fileType)) {
    throw new AppError('Invalid file type', 400, 'INVALID_FILE_TYPE');
  }

  // For simplicity, fileId is the filename
  // In a real app, you'd have a file database with proper IDs
  const type = fileType === 'avatar' ? 'avatar' : 'coupon';
  
  await fileUtils.deleteFile(fileId, type);

  // If deleting avatar, update user profile
  if (fileType === 'avatar') {
    user.profile.avatar = null;
    await user.save();
  }

  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'file_deleted',
    details: {
      fileType: fileType,
      filename: fileId
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  logger.audit('File deleted', {
    userId: user._id,
    fileType: fileType,
    filename: fileId
  });

  res.json({
    success: true,
    message: 'File deleted successfully'
  });
});

/**
 * Get upload statistics
 */
const getUploadStats = catchAsync(async (req, res) => {
  const user = req.user;

  const stats = await fileUtils.getFileStats(user._id);

  // Get upload history from activity logs
  const uploadHistory = await ActivityLog.find({
    user: user._id,
    action: { $in: ['file_uploaded', 'avatar_updated', 'bulk_upload'] }
  })
    .sort({ timestamp: -1 })
    .limit(20)
    .lean();

  res.json({
    success: true,
    data: {
      stats,
      recentUploads: uploadHistory,
      limits: {
        maxFileSize: config.MAX_FILE_SIZE,
        maxFilesPerUpload: config.MAX_FILES_PER_UPLOAD,
        allowedTypes: config.ALLOWED_IMAGE_TYPES
      }
    }
  });
});

/**
 * Cleanup temporary files (admin only)
 */
const cleanupTempFiles = catchAsync(async (req, res) => {
  const { maxAge } = req.query;
  
  const cleanedCount = await fileUtils.cleanupTempFiles(
    maxAge ? parseInt(maxAge) * 1000 : undefined
  );

  logger.audit('Temp files cleanup', {
    userId: req.user._id,
    cleanedCount: cleanedCount
  });

  res.json({
    success: true,
    message: `Cleaned up ${cleanedCount} temporary files`,
    data: {
      cleanedCount
    }
  });
});

/**
 * Multer error handler
 */
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          success: false,
          message: 'File too large',
          error: 'FILE_TOO_LARGE',
          maxSize: config.MAX_FILE_SIZE
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files',
          error: 'TOO_MANY_FILES',
          maxFiles: config.MAX_FILES_PER_UPLOAD
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field',
          error: 'UNEXPECTED_FIELD'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Upload error',
          error: 'UPLOAD_ERROR'
        });
    }
  }

  if (error.message === 'Invalid file type. Only images are allowed.') {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: 'INVALID_FILE_TYPE',
      allowedTypes: config.ALLOWED_IMAGE_TYPES
    });
  }

  next(error);
};

// Export multer middleware configurations
const uploadSingle = upload.single('file');
const uploadMultiple = upload.array('files', config.MAX_FILES_PER_UPLOAD);

module.exports = {
  uploadCouponImage,
  uploadAvatar,
  uploadBulk,
  deleteFile,
  getUploadStats,
  cleanupTempFiles,
  handleMulterError,
  uploadSingle,
  uploadMultiple
};