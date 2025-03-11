const express = require('express');
const router = express.Router();
const Driver = require('../../modals/Driver');
const verifyToken = require('../../helper/utils/verifytokenDriver');

/**
 * @route   POST /api/driver/update-location
 * @desc    Update driver's current location
 * @access  Private (Driver only)
 */
router.post('/update-location', verifyToken, async (req, res) => {
    try {
        const { location } = req.body;

        // Validate the location data
        if (!location || !location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
            return res.status(400).json({
                message: 'Invalid location format. Please provide coordinates as [longitude, latitude]'
            });
        }

        // Extract coordinates
        const [longitude, latitude] = location.coordinates;

        // Validate longitude and latitude
        if (typeof longitude !== 'number' || typeof latitude !== 'number' ||
            longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
            return res.status(400).json({
                message: 'Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90'
            });
        }

        // Update driver's location
        const driver = await Driver.findById(req.user._id);

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        // Set the location with proper GeoJSON format
        driver.location = {
            type: 'Point',
            coordinates: [longitude, latitude]
        };

        await driver.save();

        res.status(200).json({
            message: 'Location updated successfully',
            location: driver.location
        });

    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;