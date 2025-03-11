const express = require('express');
const router = express.Router();
const Driver = require('../../modals/Driver');
const Booking = require('../../modals/booking');
const verifyToken = require('../../helper/utils/verifytokenUsers');
const { broadcastToNearbyDrivers } = require('../driver/DriverNotificationService');

/**
 * @route POST /api/find-drivers
 * @desc Find available drivers near a location and broadcast booking request
 * @access Private (User only)
 */
router.post('/find-drivers', verifyToken, async (req, res) => {
    try {
        const {
            pickupLocation,
            dropLocation,
            rideType,
            paymentMethod,
            fare,
            distance,
            duration,
            serviceTypeCategory
        } = req.body;

        // Validate required fields
        if (!pickupLocation || !pickupLocation.coordinates) {
            return res.status(400).json({ message: 'Pickup location coordinates are required' });
        }

        // Extract coordinates
        const [longitude, latitude] = pickupLocation.coordinates;

        // Define search radius (in meters)
        const maxDistance = 5000; // 5 kilometers

        // Find available drivers near pickup location
        const availableDrivers = await Driver.find({
            isActive: true,
            approvalStatus: 'approved',
            // If category is specified, filter by it
            ...(serviceTypeCategory && { categories: serviceTypeCategory }),
            // Geospatial query to find nearby drivers
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    $maxDistance: maxDistance
                }
            }
        }).limit(10); // Limit to 10 nearest drivers

        if (availableDrivers.length === 0) {
            return res.status(404).json({ message: 'No drivers available nearby' });
        }

        // Create a new booking with pending status
        const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

        const newBooking = new Booking({
            passengerId: req.user._id,
            pickupLocation,
            dropLocation,
            rideType,
            paymentMethod,
            fare,
            distance,
            duration,
            status: 'pending',
            serviceTypeCategory: serviceTypeCategory || null,
            verificationCode,
            verificationStatus: 'pending'
        });

        await newBooking.save();
        // Broadcast to nearby drivers
        broadcastToNearbyDrivers(availableDrivers, newBooking, req.user);

        res.status(200).json({
            message: 'Booking request sent to nearby drivers',
            bookingId: newBooking._id,
            driversNotified: availableDrivers.length
        });

    } catch (error) {
        console.error('Find drivers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;