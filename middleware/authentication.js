const User = require('../models/user'); // Make sure this path matches your actual file location
const jwt = require('jsonwebtoken');


const auth = async (req, res, next) => {
  // check header
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer')) {
    throw new UnauthenticatedError('Authentication invalid')
  }
  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    // attach the user to the job routes
    req.user = { id: payload.userId || payload.id, 
      role: payload.role }
    next()
  } catch (error) {
    return res.status(401).json({success : false , error: 'Authentication invalid' });
  }
}

module.exports = auth