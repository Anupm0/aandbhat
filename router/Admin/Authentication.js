// authentication.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const transporter = require('../../helper/emailTransporter/EmailTransforter')
const Admin = require('../../modals/Admin'); // Adjust the path to your Admin model file
const verifyTokenAdmin = require('../../helper/utils/verifytokenAdmin');

// Environment variables (set these in your environment or .env file)
const JWT_SECRET = process.env.JWT_SECRET || 'MASWORLDIT';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15h';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your_refresh_secret';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

/**
 * Helper: Generate an access token
 */
const generateAccessToken = (admin) => {
    return jwt.sign(
        { id: admin._id, email: admin.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

/**
 * Helper: Generate a refresh token
 */
const generateRefreshToken = (admin) => {
    return jwt.sign(
        { id: admin._id, email: admin.email },
        REFRESH_TOKEN_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
};



/**
 * @route   POST /signup
 * @desc    Register a new admin
 */
// router.post('/signup', async (req, res) => {
//     try {
//         const { email, password, username, firstname, lastname, mobile } = req.body;

//         // Check if an admin already exists with the given email or mobile
//         const existingAdmin = await Admin.findOne({ $or: [{ email }, { mobile }, { username }] });
//         if (existingAdmin) {
//             return res.status(400).json({ message: 'Admin with provided email or mobile already exists' });
//         }

//         // Hash password before saving
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(password, salt);

//         const admin = new Admin({
//             email,
//             password: hashedPassword,
//             firstname,
//             lastname,
//             username,
//             verificationToken: generateVerificationToken(),
//             mobile,
//         });

//         const verificationLink = `${req.protocol}://${req.hostname}/api/admin/auth/verify-email?token=${admin?.verificationToken}`;

//         await admin.save();


//         const mailOptions = {
//             from: process.env.EMAIL_USER,
//             to: email,
//             subject: 'Email Confirmation',


//             //nice html and text with css and pleaseing admin to confirm there email

//             html: `
//             <h1>Hi ${firstname},</h1>
//             <p>Thank you for signing up with us. Please click the link below to verify your email address:</p>
//             <a href="${verificationLink}">Verify Email</a>
//             <p>If you did not sign up for this account, please ignore this email.</p>
//             <p>Regards,</p>
//             <p>Drvyy</p>
//             `,

//             text: `Hi ${firstname},\n\nThank you for signing up with us. Please click the link below to verify your email address:\n\n${verificationLink}\n\nIf you did not sign up for this account, please ignore this email.\n\nRegards,\nDrvyy`
//         };

//         await transporter.sendMail(mailOptions, (error, info) => {
//             if (error) {
//                 console.log('Error sending email:', error);

//             } else {
//                 console.log('Email sent:', info.response);

//             }
//         });

//         res.status(201).json({ message: 'Admin created successfully' })
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

/**
 * @route   POST /login
 * @desc    Login admin and return tokens
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Verify that admin has verified their email
        console.log("ADMIN STATUS", admin.isEmailVerified);
        if (admin.isEmailVerified === false) {
            const verificationLink = `${req.protocol}://${req.hostname}/api/auth/verify-email?token=${admin.verificationToken}`;
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Email Confirmation',
                html: `
                    <h1>Hi ${admin.username},</h1>
                    <p>Thank you for signing up with us. Please click the link below to verify your email address:</p>
                    <a href="${verificationLink}">Verify Email</a>
                    <p>If you did not sign up for this account, please ignore this email.</p>
                    <p>Regards,</p>
                    <p>Drvyy</p>
                `,
                text: `Hi ${admin.username},\n\nThank you for signing up with us. Please click the link below to verify your email address:\n\n${verificationLink}\n\nIf you did not sign up for this account, please ignore this email.\n\nRegards,\nDrvyy`
            };

            await transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log("Email sent:", info.response);
                }
            });

            return res.status(400).json({ message: 'Please verify your email first' });
        }

        admin.lastLogin = new Date();
        await admin.save();

        const accessToken = generateAccessToken(admin);
        const refreshToken = generateRefreshToken(admin);

        res.status(201).json({ accessToken, refreshToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /refresh-token
 * @desc    Generate a new access token using a refresh token
 */
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Invalid refresh token' });
            }
            const newAccessToken = jwt.sign(
                { id: decoded.id, email: decoded.email },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );
            res.status(201).json({ accessToken: newAccessToken });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /forgot-password
 * @desc    Generate an OTP for password reset and send it to the admin
 */
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(400).json({ message: 'Admin with this email does not exist' });
        }

        // Generate a reset token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Save the token to the admin record
        admin.verificationToken = resetToken;
        // Set token expiry to 1 hour from now
        admin.otpExpiry = new Date(Date.now() + 3600000);
        await admin.save();

        // Create reset password link
        const resetLink = `${req.protocol}://${req.get('host')}/api/admin/reset-password/${resetToken}`;

        // Send email with reset link
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `
          <h1>Password Reset</h1>
          <p>Hi ${admin.firstName || admin.username},</p>
          <p>We received a request to reset your password. Please click the link below to reset your password:</p>
          <a href="${resetLink}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>Regards,</p>
          <p>The Team</p>
        `,
            text: `Hi ${admin.firstName || admin.username},\n\nWe received a request to reset your password. Please click the link below to reset your password:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.\n\nRegards,\nThe Team`
        };

        console.log("reset link ", resetLink);
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });

        res.status(204).json({ message: 'Password reset link sent to your email' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /reset-password/:token
 * @desc    Verify token and show password reset form
 */
router.get('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const admin = await Admin.findOne({
            verificationToken: token,
            otpExpiry: { $gt: new Date() }
        });

        if (!admin) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }


        const html = `
        <html>
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #f4f4f4;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                h1 {

                    color: #333;
                    margin-bottom: 20px;
                }
                p {
                    color: #333;
                    margin-bottom: 20px;
                }
                a {
                    padding: 10px 15px;
                    background-color: #4CAF50;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Reset Password</h1>
                <p>Hi ${admin.firstName || admin.username},</p>
                <p>Enter your new password below:</p>
                <form action="${req.protocol}://${req.get('host')}/api/admin/reset-password/${token}" method="POST">
                    <input type="password" name="newPassword" placeholder="New Password" required style="padding: 10px; width: 100%; margin-bottom: 10px;">
                    <button type="submit" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</button>
                </form>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, you can safely ignore this email.</p>
                <p>Regards,</p>
                <p>The Team</p>
            </div>
        </body>
        </html>
        `;

        res.send(html);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /reset-password/:token
 * @desc    Reset password using the verification token
 */
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ message: 'New password is required' });
        }

        const admin = await Admin.findOne({
            verificationToken: token,
            otpExpiry: { $gt: new Date() } // Check if token hasn't expired
        });

        if (!admin) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the admin record
        admin.password = hashedPassword;
        admin.verificationToken = null;
        admin.otpExpiry = null;
        await admin.save();

        res.json({ message: 'Password has been reset successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
/**
 * @route   POST /reset-password
 * @desc    Reset password using the OTP
 */




router.get('/verify-email/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const admin = await Admin.findOne({ verificationToken: token });
        if (!admin) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        admin.isEmailVerified = true;
        admin.verificationToken = null;
        await admin.save();

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


/**
 * @route   GET /me
 * @desc    Get current admin's profile
 */
router.get('/me', verifyTokenAdmin, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password -otp -otpExpiry');
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.json(admin);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
