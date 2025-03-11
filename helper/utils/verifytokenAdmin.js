const jwt = require('jsonwebtoken');
const Admin = require('../../modals/Admin');

/**
 * Middleware to verify JWT tokens for admin users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function verifyTokenAdmin(req, res, next) {
    try {
        // Get authorization header
        const authHeader = req.headers['authorization'];

        console.log('authHeader:', authHeader);

        // Check if auth header exists and has correct format
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Invalid authorization header format. Use: Bearer <token>'
            });
        }

        // Extract token
        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if token is expired
        if (decoded.exp && decoded.exp < Date.now() / 1000) {
            return res.status(401).json({
                success: false,
                message: 'Token has expired'
            });
        }

        // Find admin
        const admin = await Admin.findById(decoded.adminId)
            .select('-password -otp -otpExpiry -verificationToken');  // Exclude sensitive data

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Add admin to request object
        req.admin = admin;
        req.admin.adminId = admin._id;
        next();

    } catch (error) {
        console.error('Admin token verification error:', error);

        // Handle specific JWT errors
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token format'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired'
            });
        }

        // Handle other errors
        res.status(500).json({
            success: false,
            message: 'Admin authentication failed'
        });
    }
}

module.exports = verifyTokenAdmin;