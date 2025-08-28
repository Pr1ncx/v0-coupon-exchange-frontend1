const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, ActivityLog } = require('../models');
const config = require('../config');
const logger = require('../config/logger');
const { AppError, catchAsync } = require('../middlewares/errorHandler');

/**
 * Register a new user
 */
const register = catchAsync(async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;
  
  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });
  
  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username';
    throw new AppError(`User with this ${field} already exists`, 400, 'USER_EXISTS');
  }
  
  // Create new user
  const userData = {
    username,
    email,
    password,
    profile: {}
  };
  
  if (firstName) userData.profile.firstName = firstName;
  if (lastName) userData.profile.lastName = lastName;
  
  const user = new User(userData);
  await user.save();
  
  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  await user.save(); // Save refresh token
  
  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'user_registered',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  logger.audit('User registered', {
    userId: user._id,
    username: user.username,
    email: user.email,
    ip: req.ip
  });
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: user.toPublicJSON(),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.JWT_ACCESS_EXPIRY
      }
    }
  });
});

/**
 * Login user
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  
  // Find user with password field
  const user = await User.findOne({ email }).select('+password +refreshTokens +loginAttempts +lockUntil');
  
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
  
  // Check if account is locked
  if (user.isLocked) {
    const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
    throw new AppError(
      `Account is locked. Try again in ${lockTimeRemaining} minutes`,
      423,
      'ACCOUNT_LOCKED'
    );
  }
  
  // Check if account is active
  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
  }
  
  // Verify password
  const isValidPassword = await user.comparePassword(password);
  
  if (!isValidPassword) {
    await user.incrementLoginAttempts();
    
    logger.audit('Failed login attempt', {
      email: email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      attempts: user.loginAttempts + 1
    });
    
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
  
  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }
  
  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  
  // Update login tracking
  user.lastLoginAt = new Date();
  user.lastActiveAt = new Date();
  await user.save();
  
  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'user_login',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  logger.audit('User logged in', {
    userId: user._id,
    username: user.username,
    email: user.email,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toPublicJSON(),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.JWT_ACCESS_EXPIRY
      }
    }
  });
});

/**
 * Refresh access token
 */
const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.body;
  
  if (!token) {
    throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
  }
  
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid token type', 401, 'INVALID_TOKEN_TYPE');
    }
    
    const user = await User.findById(decoded.userId).select('+refreshTokens');
    
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    
    // Check if refresh token exists in user's stored tokens
    const storedToken = user.refreshTokens.find(rt => rt.token === token);
    
    if (!storedToken) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
    
    // Generate new tokens
    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();
    
    // Remove old refresh token
    user.revokeRefreshToken(token);
    await user.save();
    
    logger.audit('Token refreshed', {
      userId: user._id,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: config.JWT_ACCESS_EXPIRY
        }
      }
    });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
    throw error;
  }
});

/**
 * Logout user
 */
const logout = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.body;
  const user = req.user;
  
  if (token) {
    // Remove specific refresh token
    user.revokeRefreshToken(token);
  } else {
    // Remove all refresh tokens (logout from all devices)
    user.revokeAllRefreshTokens();
  }
  
  await user.save();
  
  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'user_logout',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  logger.audit('User logged out', {
    userId: user._id,
    ip: req.ip,
    allDevices: !token
  });
  
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * Logout from all devices
 */
const logoutAll = catchAsync(async (req, res) => {
  const user = req.user;
  
  user.revokeAllRefreshTokens();
  await user.save();
  
  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'user_logout',
    details: { allDevices: true },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  logger.audit('User logged out from all devices', {
    userId: user._id,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: 'Logged out from all devices successfully'
  });
});

/**
 * Get current user profile
 */
const getProfile = catchAsync(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user.toPublicJSON()
    }
  });
});

/**
 * Update user profile
 */
const updateProfile = catchAsync(async (req, res) => {
  const user = req.user;
  const updates = req.body;
  
  // Update profile fields
  if (updates.firstName !== undefined) {
    user.profile.firstName = updates.firstName;
  }
  if (updates.lastName !== undefined) {
    user.profile.lastName = updates.lastName;
  }
  if (updates.bio !== undefined) {
    user.profile.bio = updates.bio;
  }
  if (updates.location !== undefined) {
    user.profile.location = updates.location;
  }
  
  // Update preferences
  if (updates.preferences) {
    user.preferences = { ...user.preferences, ...updates.preferences };
  }
  
  await user.save();
  
  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'user_profile_updated',
    details: { updatedFields: Object.keys(updates) },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  logger.audit('Profile updated', {
    userId: user._id,
    updatedFields: Object.keys(updates)
  });
  
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: user.toPublicJSON()
    }
  });
});

/**
 * Change user password
 */
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  // Get user with password
  const user = await User.findById(req.user._id).select('+password');
  
  // Verify current password
  const isValidPassword = await user.comparePassword(currentPassword);
  
  if (!isValidPassword) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
  }
  
  // Check if new password is different
  const isSamePassword = await user.comparePassword(newPassword);
  
  if (isSamePassword) {
    throw new AppError('New password must be different from current password', 400, 'SAME_PASSWORD');
  }
  
  // Update password
  user.password = newPassword;
  
  // Revoke all refresh tokens for security
  user.revokeAllRefreshTokens();
  
  await user.save();
  
  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'user_password_changed',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  logger.audit('Password changed', {
    userId: user._id,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: 'Password changed successfully. Please log in again with your new password.'
  });
});

/**
 * Request password reset
 */
const requestPasswordReset = catchAsync(async (req, res) => {
  const { email } = req.body;
  
  const user = await User.findOne({ email });
  
  if (!user) {
    // Don't reveal if email exists or not
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }
  
  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  await user.save();
  
  logger.audit('Password reset requested', {
    userId: user._id,
    email: user.email,
    ip: req.ip
  });
  
  // TODO: Send email with reset token
  // For now, return the token in development mode
  const responseData = {
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.'
  };
  
  if (config.isDevelopment()) {
    responseData.resetToken = resetToken; // Only for development
  }
  
  res.json(responseData);
});

/**
 * Reset password with token
 */
const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;
  
  if (!token || !newPassword) {
    throw new AppError('Token and new password are required', 400, 'MISSING_REQUIRED_FIELDS');
  }
  
  // Hash the provided token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  // Find user with valid reset token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  }).select('+password');
  
  if (!user) {
    throw new AppError('Token is invalid or has expired', 400, 'INVALID_RESET_TOKEN');
  }
  
  // Update password
  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  
  // Revoke all refresh tokens
  user.revokeAllRefreshTokens();
  
  await user.save();
  
  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'user_password_reset',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  logger.audit('Password reset completed', {
    userId: user._id,
    email: user.email,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: 'Password has been reset successfully. Please log in with your new password.'
  });
});

/**
 * Verify user account (if email verification is enabled)
 */
const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    throw new AppError('Verification token is required', 400, 'MISSING_TOKEN');
  }
  
  // Hash the provided token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  // Find user with valid verification token
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });
  
  if (!user) {
    throw new AppError('Token is invalid or has expired', 400, 'INVALID_VERIFICATION_TOKEN');
  }
  
  // Update user
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  
  await user.save();
  
  // Log activity
  await ActivityLog.logActivity({
    user: user._id,
    action: 'user_email_verified',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  logger.audit('Email verified', {
    userId: user._id,
    email: user.email,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: 'Email verified successfully'
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  verifyEmail
};