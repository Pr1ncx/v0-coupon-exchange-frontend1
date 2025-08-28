const auth = require('./auth');
const validation = require('./validation');
const rateLimiting = require('./rateLimiting');
const errorHandler = require('./errorHandler');
const security = require('./security');
const monitoring = require('./monitoring');

module.exports = {
  ...auth,
  ...validation,
  ...rateLimiting,
  errorHandler,
  security,
  monitoring
};