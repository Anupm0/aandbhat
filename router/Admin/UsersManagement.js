const express = require('express');
const router = express.Router();
const Users = require('../../modals/user');

const verifyTokenAdmin = require('../../helper/utils/verifytokenAdmin');

/**
 * GET utility settings
 * Retrieves all configurable utility settings for the admin dashboard
 */
router.get('/getallusers', verifyTokenAdmin, async (req, res) => {
    try {
        // Try to find existing utility document
        let user = await Users.find();

        res.status(200).json({
            message: 'User data retrieved successfully',
            data: user
        });
    } catch (error) {
        console.error('Error fetching User data:', error);
        res.status(500).json({
            message: 'Failed to fetch User data',
            error: error.message
        });
    }
});


/**
 * PATCH update user
 * Allows admin to update a user's email, phone, and verification status
 */
router.patch('/update/:userId', verifyTokenAdmin, async (req, res) => {
    try {
        
        const { userId } = req.params;
        const { email, mobile, isEmailVerified, isMobileVerified } = req.body;
        if (!userId) {
            return res.status(400).json({
                message: 'User ID is required'
            });
        }
        
        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }
        
        const updateFields = {};
        if (email !== undefined) {
            // Check if the new email already exists (except for the current user)
            if (email !== user.email) {
                const emailExists = await Users.findOne({ email, _id: { $ne: userId } });
                if (emailExists) {
                    return res.status(400).json({
                        message: 'Email already in use by another user'
                    });
                }
                updateFields.email = email;
            }
        }
        
        if (mobile !== undefined) {
            // Check if the new mobile already exists (except for the current user)
            if (mobile !== user.mobile) {
                const mobileExists = await Users.findOne({ mobile, _id: { $ne: userId } });
                if (mobileExists) {
                    return res.status(400).json({
                        message: 'Mobile number already in use by another user'
                    });
                }
                updateFields.mobile = mobile;
            }
        }
        
        // Update verification statuses if provided
        if (isEmailVerified !== undefined) {
            updateFields.isEmailVerified = isEmailVerified;
        }
        
        if (isMobileVerified !== undefined) {
            updateFields.isMobileVerified = isMobileVerified;
        }
        
        // Update the user
        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true } // Return the updated document
        );
        
        res.status(200).json({
            message: 'User updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            message: 'Failed to update user',
            error: error.message
        });
    }
});


/**
 * DELETE user
 * Allows admin to delete a user
 */
router.delete('/delete/:userId', verifyTokenAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                message: 'User ID is required'
            });
        }
        
        // Find the user first to verify it exists
        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }
        
        // Delete the user
        await Users.findByIdAndDelete(userId);
        
        res.status(200).json({
            message: 'User deleted successfully',
            deletedUserId: userId
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            message: 'Failed to delete user',
            error: error.message
        });
    }
});

module.exports = router