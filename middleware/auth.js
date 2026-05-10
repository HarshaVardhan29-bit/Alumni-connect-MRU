const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });

    // Block suspended accounts
    if (user.isActive === false || user.status === 'suspended') {
      return res.status(403).json({
        message: 'Your account has been suspended. Please contact support.',
        suspended: true,
      });
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid' });
  }
};

module.exports = { protect };
