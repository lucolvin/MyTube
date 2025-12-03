// Auth middleware disabled - no authentication required
// All routes are accessible without login

const noAuth = (req, res, next) => {
  next();
};

module.exports = { requireAuth: noAuth, optionalAuth: noAuth };
