const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function generateToken(user) {
    return jwt.sign(
        { userId: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateVerificationToken() {
    return crypto.randomBytes(16).toString('hex');
}

module.exports = {
    generateToken,
    generateOTP,
    generateVerificationToken
};