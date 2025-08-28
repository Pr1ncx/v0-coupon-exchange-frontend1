const express = require('express');
const uploadController = require('../controllers/uploadController');
const { 
  authenticate,
  authorize,
  uploadRateLimit,
  fileUploadSecurity
} = require('../middlewares');

const router = express.Router();

// Apply authentication to all upload routes
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: File upload and management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UploadedFile:
 *       type: object
 *       properties:
 *         filename:
 *           type: string
 *           description: Generated filename
 *         originalName:
 *           type: string
 *           description: Original filename
 *         mimetype:
 *           type: string
 *           description: File MIME type
 *         size:
 *           type: number
 *           description: File size in bytes
 *         type:
 *           type: string
 *           enum: [avatar, coupon]
 *           description: File type
 *         url:
 *           type: string
 *           description: File URL
 *         thumbnailUrl:
 *           type: string
 *           description: Thumbnail URL
 *         metadata:
 *           type: object
 *           properties:
 *             width:
 *               type: number
 *             height:
 *               type: number
 *             format:
 *               type: string
 *         uploadedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/upload/coupon-image:
 *   post:
 *     summary: Upload coupon image
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, WebP, GIF)
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     file:
 *                       $ref: '#/components/schemas/UploadedFile'
 *       400:
 *         description: No file provided or invalid file
 *       401:
 *         description: Authentication required
 *       413:
 *         description: File too large
 *       429:
 *         description: Upload rate limit exceeded
 */
router.post('/coupon-image',
  uploadRateLimit,
  uploadController.uploadSingle,
  fileUploadSecurity,
  uploadController.handleMulterError,
  uploadController.uploadCouponImage
);

/**
 * @swagger
 * /api/v1/upload/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file
 *     responses:
 *       200:
 *         description: Avatar updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     file:
 *                       $ref: '#/components/schemas/UploadedFile'
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: No file provided or invalid file
 *       401:
 *         description: Authentication required
 *       413:
 *         description: File too large
 *       429:
 *         description: Upload rate limit exceeded
 */
router.post('/avatar',
  uploadRateLimit,
  uploadController.uploadSingle,
  fileUploadSecurity,
  uploadController.handleMulterError,
  uploadController.uploadAvatar
);

/**
 * @swagger
 * /api/v1/upload/bulk:
 *   post:
 *     summary: Bulk upload images (max 5 files)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *                 description: Multiple image files
 *     responses:
 *       201:
 *         description: Files uploaded successfully (partial success possible)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     files:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UploadedFile'
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           filename:
 *                             type: string
 *                           error:
 *                             type: string
 *       400:
 *         description: No files provided, too many files, or all uploads failed
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Upload rate limit exceeded
 */
router.post('/bulk',
  uploadRateLimit,
  uploadController.uploadMultiple,
  fileUploadSecurity,
  uploadController.handleMulterError,
  uploadController.uploadBulk
);

/**
 * @swagger
 * /api/v1/upload/stats:
 *   get:
 *     summary: Get user upload statistics
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upload statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalFiles:
 *                           type: number
 *                         totalSize:
 *                           type: number
 *                         fileTypes:
 *                           type: object
 *                     recentUploads:
 *                       type: array
 *                       items:
 *                         type: object
 *                     limits:
 *                       type: object
 *       401:
 *         description: Authentication required
 */
router.get('/stats',
  uploadController.getUploadStats
);

/**
 * @swagger
 * /api/v1/upload/{fileType}/{fileId}:
 *   delete:
 *     summary: Delete uploaded file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [coupon-image, avatar]
 *         description: Type of file to delete
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID (filename)
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       400:
 *         description: Invalid file type
 *       401:
 *         description: Authentication required
 *       404:
 *         description: File not found
 */
router.delete('/:fileType/:fileId',
  uploadController.deleteFile
);

/**
 * @swagger
 * /api/v1/upload/cleanup:
 *   post:
 *     summary: Cleanup temporary files (admin only)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: maxAge
 *         schema:
 *           type: number
 *           default: 86400
 *         description: Maximum age of files to keep (in seconds)
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     cleanedCount:
 *                       type: number
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.post('/cleanup',
  authorize('admin'),
  uploadController.cleanupTempFiles
);

module.exports = router;