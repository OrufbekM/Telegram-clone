const jwt = require('jsonwebtoken');
const config = require('../config/db.config.js');
const verifyToken = (req, res, next) => {
  const token = req.headers['x-access-token'] || req.headers['authorization'];
  if (!token) {
    return res.status(403).json({
      message: "No token provided!"
    });
  }
  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), config.jwtSecret);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Unauthorized!"
    });
  }
};
module.exports = {
  verifyToken
};

