const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function generateToken(user) {
    return jwt.sign(
        { userId: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, approvalStatus: user.approvalStatus },
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

function generateRideVerificationCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}


async function verifyRideOTP(bookingId, otp) {
    const Booking = require('../../modals/booking');
    const booking = await Booking.findById(bookingId);

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (booking.verificationStatus === 'verified') {
        throw new Error('Booking already verified');
    }

    if (booking.verificationCodeExpiry < new Date()) {
        throw new Error('Verification code expired');
    }

    if (booking.verificationCode !== otp) {
        throw new Error('Invalid verification code');
    }

    booking.verificationStatus = 'verified';
    await booking.save();

    return booking;
}


module.exports = {
    generateToken,
    generateOTP,
    generateVerificationToken,
    verifyRideOTP
};