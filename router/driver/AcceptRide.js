const express = require('express');
const router = express.Router();
const Booking = require('../../modals/booking');
const Driver = require('../../modals/Driver');
const verifyToken = require('../../helper/utils/verifytokenDriver');
const socketManager = require('../../helper/utils/socketManager');

/**
 * @route POST /api/driver/accept-ride
 * @desc Accept a ride request
 * @access Private (Driver only)
 */
router.post('/accept-ride', verifyToken, async (req, res) => {
    try {
        const { bookingId } = req.body;
        const driverId = req.user._id;

        if (!bookingId) {
            return res.status(400).json({ message: 'Booking ID is required' });
        }

        // Find the booking
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if booking is still pending
        if (booking.status !== 'pending') {
            return res.status(400).json({
                message: `Booking is already ${booking.status}`
            });
        }

        // Update booking with driver information and change status
        booking.driverId = driverId;
        booking.status = 'accepted';
        booking.acceptedAt = new Date();

        await booking.save();

        // Get the passenger
        const User = require('../../modals/user');
        const passenger = await User.findById(booking.passengerId);

        if (!passenger) {
            return res.status(404).json({ message: 'Passenger not found' });
        }

        // Notify passenger that a driver accepted
        const io = socketManager.getIO();
        const passengerSocketId = socketManager.getUserSocket(passenger._id);

        if (passengerSocketId && io) {
            const driverData = {
                id: req.user._id,
                name: `${req.user.firstName} ${req.user.lastName}`,
                driverId: req.user.driverId,
                mobile: req.user.mobile
            };

            io.to(passengerSocketId).emit('bookingUpdate', {
                type: 'BOOKING_ACCEPTED',
                bookingId: booking._id,
                driver: driverData,
                message: 'A driver has accepted your ride request. Be ready to provide your verification code when they arrive.'
            });
        }

        res.status(200).json({
            message: 'Ride accepted successfully',
            booking: {
                id: booking._id,
                passenger: {
                    id: passenger._id,
                    name: `${passenger.firstName || ''} ${passenger.lastName || ''}`.trim(),
                    mobile: passenger.mobile
                },
                pickupLocation: booking.pickupLocation,
                dropLocation: booking.dropLocation,
                fare: booking.fare,
                distance: booking.distance,
                duration: booking.duration
            }
        });

    } catch (error) {
        console.error('Accept ride error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/driver/reject-ride
 * @desc Reject a ride request
 * @access Private (Driver only)
 */
router.post('/reject-ride', verifyToken, async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({ message: 'Booking ID is required' });
        }

        // We don't actually change the booking status when a driver rejects
        // Instead, we just track that this driver rejected it

        // Could add to a rejections collection if needed for analytics

        res.status(200).json({ message: 'Ride request rejected' });

    } catch (error) {
        console.error('Reject ride error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/driver/start-ride
 * @desc Start a ride that was previously accepted
 * @access Private (Driver only)
 */
router.post('/start-ride', verifyToken, async (req, res) => {
    try {
        const { bookingId, verificationCode } = req.body;

        if (!bookingId) {
            return res.status(400).json({ message: 'Booking ID is required' });
        }

        if (!verificationCode) {
            return res.status(400).json({ message: 'Verification code is required' });
        }

        // Find the booking
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Ensure this driver is assigned to this booking
        if (booking.driverId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not assigned to this booking' });
        }

        // Check if booking is in the correct state
        if (booking.status !== 'accepted') {
            return res.status(400).json({
                message: `Cannot start ride with status: ${booking.status}`
            });
        }

        // Verify the OTP
        if (booking.verificationCode !== verificationCode) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Update booking status
        booking.status = 'in_progress';
        booking.startedAt = new Date();
        booking.verificationStatus = 'verified';

        await booking.save();

        // Notify passenger
        const io = socketManager.getIO();
        const passengerSocketId = socketManager.getUserSocket(booking.passengerId);

        if (passengerSocketId && io) {
            io.to(passengerSocketId).emit('bookingUpdate', {
                type: 'RIDE_STARTED',
                bookingId: booking._id,
                startedAt: booking.startedAt,
                message: 'Your ride has started'
            });
        }

        res.status(200).json({
            message: 'Ride started successfully',
            booking: {
                id: booking._id,
                status: booking.status,
                startedAt: booking.startedAt
            }
        });

    } catch (error) {
        console.error('Start ride error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/driver/complete-ride
 * @desc Complete an in-progress ride
 * @access Private (Driver only)
 */
router.post('/complete-ride', verifyToken, async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({ message: 'Booking ID is required' });
        }

        // Find the booking
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Ensure this driver is assigned to this booking
        if (booking.driverId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not assigned to this booking' });
        }

        // Check if booking is in the correct state
        if (booking.status !== 'in_progress') {
            return res.status(400).json({
                message: `Cannot complete ride with status: ${booking.status}`
            });
        }

        // Update booking status
        booking.status = 'completed';
        booking.completedAt = new Date();

        await booking.save();

        // Create work log entry for the driver
        const WorkLog = require('../../modals/WorkLog');
        const workLog = new WorkLog({
            driverId: req.user._id,
            workedFor: booking.passengerId,
            date: new Date(),
            shiftStartTime: booking.startedAt,
            shuftEndTime: booking.completedAt,
            totalHoursWorked: (booking.completedAt - booking.startedAt) / (1000 * 60 * 60), // Hours
            notes: `Ride from ${booking.pickupLocation} to ${booking.dropLocation}`,
            location: booking.dropLocation
        });

        await workLog.save();

        // Notify passenger
        const io = socketManager.getIO();
        const passengerSocketId = socketManager.getUserSocket(booking.passengerId);

        if (passengerSocketId && io) {
            io.to(passengerSocketId).emit('bookingUpdate', {
                type: 'RIDE_COMPLETED',
                bookingId: booking._id,
                completedAt: booking.completedAt,
                message: 'Your ride has been completed'
            });
        }

        res.status(200).json({
            message: 'Ride completed successfully',
            booking: {
                id: booking._id,
                status: booking.status,
                completedAt: booking.completedAt
            }
        });

    } catch (error) {
        console.error('Complete ride error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;