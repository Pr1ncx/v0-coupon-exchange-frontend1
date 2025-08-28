const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const config = require('../config');
const logger = require('../config/logger');

/**
 * File utilities for handling uploads and processing
 */
class FileUtils {
  constructor() {
    this.uploadPath = config.UPLOAD_PATH;
    this.maxFileSize = config.MAX_FILE_SIZE;
    this.allowedTypes = config.ALLOWED_IMAGE_TYPES;
  }

  /**
   * Ensure upload directories exist
   */
  async ensureDirectories() {
    const dirs = [
      path.join(this.uploadPath, 'coupons'),
      path.join(this.uploadPath, 'avatars'),
      path.join(this.uploadPath, 'temp'),
      path.join(this.uploadPath, 'thumbnails')
    ];

    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch (error) {
        await fs.mkdir(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
    }
  }

  /**
   * Generate unique filename
   */
  generateFilename(originalName, prefix = '') {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}${timestamp}_${random}${ext}`;
  }

  /**
   * Calculate file hash for deduplication
   */
  async calculateFileHash(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      logger.error('Error calculating file hash:', error);
      throw error;
    }
  }

  /**
   * Validate file type and size
   */
  validateFile(file) {
    const errors = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds ${this.maxFileSize} bytes`);
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    if (!this.allowedTypes.includes(ext)) {
      errors.push(`File type .${ext} not allowed. Allowed types: ${this.allowedTypes.join(', ')}`);
    }

    // Check MIME type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`MIME type ${file.mimetype} not allowed`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Process and optimize image
   */
  async processImage(inputPath, outputPath, options = {}) {
    try {
      const {
        width = 1024,
        height = 1024,
        quality = 85,
        format = 'jpeg',
        fit = 'inside',
        withoutEnlargement = true
      } = options;

      await sharp(inputPath)
        .resize(width, height, { 
          fit: fit,
          withoutEnlargement: withoutEnlargement
        })
        .jpeg({ quality: quality })
        .toFile(outputPath);

      // Get processed image metadata
      const metadata = await sharp(outputPath).metadata();
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: (await fs.stat(outputPath)).size
      };
    } catch (error) {
      logger.error('Error processing image:', error);
      throw new Error('Failed to process image');
    }
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(inputPath, outputPath, size = 300) {
    try {
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      return {
        width: size,
        height: size,
        size: (await fs.stat(outputPath)).size
      };
    } catch (error) {
      logger.error('Error generating thumbnail:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  /**
   * Save uploaded file with processing
   */
  async saveFile(file, type, userId, options = {}) {
    try {
      await this.ensureDirectories();

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Generate paths
      const filename = this.generateFilename(file.originalname, `${type}_`);
      const tempPath = path.join(this.uploadPath, 'temp', filename);
      const finalPath = path.join(this.uploadPath, type === 'avatar' ? 'avatars' : 'coupons', filename);
      const thumbnailPath = path.join(this.uploadPath, 'thumbnails', filename);

      // Save original file temporarily
      await fs.writeFile(tempPath, file.buffer);

      // Calculate hash for deduplication
      const fileHash = await this.calculateFileHash(tempPath);

      // Check for existing file with same hash
      const existingFile = await this.findFileByHash(fileHash, type);
      if (existingFile && options.deduplicate !== false) {
        // Clean up temp file
        await fs.unlink(tempPath);
        
        logger.info('File already exists, returning existing file', {
          hash: fileHash,
          existingFile: existingFile.filename
        });
        
        return existingFile;
      }

      // Process image
      const processedMetadata = await this.processImage(tempPath, finalPath, {
        width: type === 'avatar' ? 512 : 1024,
        height: type === 'avatar' ? 512 : 1024,
        ...options
      });

      // Generate thumbnail
      const thumbnailMetadata = await this.generateThumbnail(finalPath, thumbnailPath);

      // Clean up temp file
      await fs.unlink(tempPath);

      const fileData = {
        filename: filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: processedMetadata.size,
        hash: fileHash,
        type: type,
        userId: userId,
        url: `/uploads/${type === 'avatar' ? 'avatars' : 'coupons'}/${filename}`,
        thumbnailUrl: `/uploads/thumbnails/${filename}`,
        metadata: {
          width: processedMetadata.width,
          height: processedMetadata.height,
          format: processedMetadata.format,
          thumbnail: thumbnailMetadata
        },
        uploadedAt: new Date()
      };

      logger.audit('File uploaded and processed', {
        userId: userId,
        filename: filename,
        type: type,
        size: processedMetadata.size,
        hash: fileHash
      });

      return fileData;
    } catch (error) {
      logger.error('Error saving file:', error);
      throw error;
    }
  }

  /**
   * Save multiple files
   */
  async saveFiles(files, type, userId, options = {}) {
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await this.saveFile(file, type, userId, options);
        results.push(result);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    return {
      results,
      errors
    };
  }

  /**
   * Find file by hash (for deduplication)
   */
  async findFileByHash(hash, type) {
    // This would typically check a database for existing files
    // For now, we'll just return null (no deduplication)
    return null;
  }

  /**
   * Delete file
   */
  async deleteFile(filename, type) {
    try {
      const filePath = path.join(this.uploadPath, type === 'avatar' ? 'avatars' : 'coupons', filename);
      const thumbnailPath = path.join(this.uploadPath, 'thumbnails', filename);

      // Delete main file
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Delete thumbnail
      try {
        await fs.unlink(thumbnailPath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logger.warn('Thumbnail not found for deletion:', thumbnailPath);
        }
      }

      logger.audit('File deleted', {
        filename: filename,
        type: type
      });

      return true;
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      const tempDir = path.join(this.uploadPath, 'temp');
      const files = await fs.readdir(tempDir);

      let cleanedCount = 0;
      const cutoffTime = Date.now() - maxAge;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} temporary files`);
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up temp files:', error);
      throw error;
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats(userId) {
    try {
      // This would typically query a database for user's files
      // For now, return basic stats
      const avatarDir = path.join(this.uploadPath, 'avatars');
      const couponDir = path.join(this.uploadPath, 'coupons');

      const stats = {
        totalFiles: 0,
        totalSize: 0,
        fileTypes: {
          avatars: 0,
          coupons: 0
        }
      };

      // Count files (this is a simplified version)
      try {
        const avatarFiles = await fs.readdir(avatarDir);
        const couponFiles = await fs.readdir(couponDir);

        stats.fileTypes.avatars = avatarFiles.length;
        stats.fileTypes.coupons = couponFiles.length;
        stats.totalFiles = avatarFiles.length + couponFiles.length;
      } catch (error) {
        // Directories might not exist yet
      }

      return stats;
    } catch (error) {
      logger.error('Error getting file stats:', error);
      throw error;
    }
  }

  /**
   * Validate image dimensions
   */
  async validateImageDimensions(filePath, minWidth = 100, minHeight = 100, maxWidth = 4096, maxHeight = 4096) {
    try {
      const metadata = await sharp(filePath).metadata();
      const { width, height } = metadata;

      const errors = [];

      if (width < minWidth || height < minHeight) {
        errors.push(`Image too small. Minimum dimensions: ${minWidth}x${minHeight}`);
      }

      if (width > maxWidth || height > maxHeight) {
        errors.push(`Image too large. Maximum dimensions: ${maxWidth}x${maxHeight}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        dimensions: { width, height }
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Invalid image file'],
        dimensions: null
      };
    }
  }
}

module.exports = new FileUtils();