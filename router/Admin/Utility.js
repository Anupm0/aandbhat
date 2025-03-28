const express = require('express');
const router = express.Router();
const verifyTokenAdmin = require('../../helper/utils/verifytokenAdmin');
const Utility = require('../../modals/Utility');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

/**
 * GET utility settings
 * Retrieves all configurable utility settings for the admin dashboard
 */
router.get('/utility-settings', verifyTokenAdmin, async (req, res) => {
    try {
        // Try to find existing utility document
        let utility = await Utility.findOne();

        // If no document exists, create one with initial values
        if (!utility) {
            try {
                utility = new Utility({
                    paymentGateway: {
                        razorpay: {
                            keyId: 'PLACEHOLDER_ID',
                            keySecret: 'PLACEHOLDER_SECRET',
                            active: false
                        }
                    }
                });
                await utility.save();
            } catch (initError) {
                console.error('Failed to initialize utility settings:', initError);
                return res.status(500).json({
                    message: 'Failed to initialize utility settings',
                    error: initError.message
                });
            }
        }

        // Sanitize sensitive data before sending to client
        const sanitizedUtility = JSON.parse(JSON.stringify(utility));
        if (sanitizedUtility.paymentGateway?.razorpay?.keySecret) {
            // Replace actual secret with asterisks
            sanitizedUtility.paymentGateway.razorpay.keySecret =
                sanitizedUtility.paymentGateway.razorpay.keySecret.replace(/./g, '*');
        }

        res.status(200).json({
            message: 'Utility settings retrieved successfully',
            data: sanitizedUtility
        });
    } catch (error) {
        console.error('Error fetching utility settings:', error);
        res.status(500).json({
            message: 'Failed to fetch utility settings',
            error: error.message
        });
    }
});

/**
 * Validate Razorpay API keys
 * @param {string} keyId - Razorpay Key ID
 * @param {string} keySecret - Razorpay Key Secret
 * @returns {Promise<boolean>} - True if keys are valid
 */
async function validateRazorpayKeys(keyId, keySecret) {
    try {
        // Skip validation for placeholder values
        if (keyId === 'PLACEHOLDER_ID' || keySecret === 'PLACEHOLDER_SECRET') {
            return false;
        }

        // Make a simple request to Razorpay API to validate the keys
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const response = await axios.get('https://api.razorpay.com/v1/customers', {
            headers: {
                'Authorization': `Basic ${auth}`
            },
            timeout: 5000 // 5 second timeout
        });

        return response.status === 200;
    } catch (error) {
        if (error.response) {
            console.error(`Razorpay validation failed with status ${error.response.status}: ${error.response.data?.error?.description || 'Unknown error'}`);
        } else if (error.request) {
            console.error('Razorpay validation failed: No response received from API');
        } else {
            console.error('Razorpay validation error:', error.message);
        }
        return false;
    }
}

/**
 * Update ENV file with new configuration
 * @param {Object} config - Key-value pairs to update in .env file
 * @returns {Promise<boolean>} - True if successful
 */
async function updateEnvFile(config) {
    try {
        const envPath = path.resolve(process.cwd(), '.env');

        // Read existing .env file or create empty one
        let envContent = '';
        try {
            envContent = fs.readFileSync(envPath, 'utf8');
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
            // File doesn't exist, create empty one
            fs.writeFileSync(envPath, '');
            envContent = fs.readFileSync(envPath, 'utf8');

        }

        // Parse existing content
        const envConfig = dotenv.parse(envContent) || {};

        // Update with new values
        Object.assign(envConfig, config);

        // Convert back to string format
        const newEnvContent = Object.entries(envConfig)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        // Write back to file
        fs.writeFileSync(envPath, newEnvContent);

        // Update process.env with new values
        Object.assign(process.env, config);

        return true;
    } catch (error) {
        console.error('Failed to update .env file:', error);
        return false;
    }
}

/**
 * PATCH utility settings
 * Updates specific utility settings provided in the request body
 */
router.patch('/utility-settings', verifyTokenAdmin, async (req, res) => {
    try {
        const updates = req.body;

        // Find or create utility document
        let utility = await Utility.findOne();
        if (!utility) {
            utility = new Utility({
                paymentGateway: {
                    razorpay: {
                        keyId: 'PLACEHOLDER_ID',
                        keySecret: 'PLACEHOLDER_SECRET',
                        active: false
                    }
                }
            });
        }

        // Handle Razorpay key updates
        if (updates.paymentGateway?.razorpay) {
            const { keyId, keySecret } = updates.paymentGateway.razorpay;

            // Only validate if both keys are provided and different from placeholders
            if (keyId && keySecret &&
                keyId !== 'PLACEHOLDER_ID' &&
                keySecret !== 'PLACEHOLDER_SECRET') {

                const isValid = await validateRazorpayKeys(keyId, keySecret);
                if (!isValid) {
                    return res.status(400).json({
                        message: 'Invalid Razorpay keys or unable to verify. Please check and try again.'
                    });
                }

                // Update .env file with verified keys
                const envUpdateSuccess = await updateEnvFile({
                    RAZORPAY_KEY_ID: keyId,
                    RAZORPAY_KEY_SECRET: keySecret
                });

                if (!envUpdateSuccess) {
                    console.warn('Updated database but failed to update .env file');
                }
            }
        }

        // Apply all updates recursively, merging with existing data
        const deepMerge = (target, source) => {
            for (const key in source) {
                if (source[key] instanceof Object && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    deepMerge(target[key], source[key]);
                } else if (source[key] !== undefined) {
                    target[key] = source[key];
                }
            }
        };

        deepMerge(utility, updates);
        await utility.save();

        // Sanitize response
        const sanitizedUtility = JSON.parse(JSON.stringify(utility));
        if (sanitizedUtility.paymentGateway?.razorpay?.keySecret) {
            sanitizedUtility.paymentGateway.razorpay.keySecret =
                sanitizedUtility.paymentGateway.razorpay.keySecret.replace(/./g, '*');
        }

        res.status(200).json({
            message: 'Utility settings updated successfully',
            data: sanitizedUtility
        });
    } catch (error) {
        console.error('Error updating utility settings:', error);

        // Handle mongoose validation errors specifically
        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({
                message: 'Validation error in utility settings',
                errors: Object.keys(error.errors).reduce((acc, key) => {
                    acc[key] = error.errors[key].message;
                    return acc;
                }, {})
            });
        }

        res.status(500).json({
            message: 'Failed to update utility settings',
            error: error.message
        });
    }
});

module.exports = router;