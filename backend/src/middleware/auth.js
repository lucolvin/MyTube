const db = require('../config/database');
const logger = require('../utils/logger');

// Default user for no-auth mode - fetched from database on first use
let defaultUser = null;

const getDefaultUser = async () => {
  if (defaultUser) return defaultUser;
  
  try {
    // Get the admin user from database
    const result = await db.query(
      'SELECT id, username, is_admin FROM users WHERE username = $1',
      ['admin']
    );
    
    if (result.rows.length > 0) {
      defaultUser = result.rows[0];
    } else {
      // Fallback if no admin user exists
      defaultUser = { id: null, username: 'anonymous', is_admin: false };
    }
  } catch (error) {
    logger.error('Error fetching default user:', error);
    defaultUser = { id: null, username: 'anonymous', is_admin: false };
  }
  
  return defaultUser;
};

// Middleware that always provides a default user (no auth required)
const requireAuth = async (req, res, next) => {
  req.user = await getDefaultUser();
  next();
};

// Middleware that always provides a default user (no auth required)
const optionalAuth = async (req, res, next) => {
  req.user = await getDefaultUser();
  next();
};

module.exports = { requireAuth, optionalAuth };
