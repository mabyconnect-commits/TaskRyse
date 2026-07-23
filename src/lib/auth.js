const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('./config');

const hashPassword = (plain) => bcrypt.hash(plain, 10);
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: '7d' },
  );
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken };
