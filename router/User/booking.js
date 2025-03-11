
const router = require('express').Router();
const Booking = require('../../modals/booking');
const verifyToken = require('../../helper/utils/verifytokenUsers');

router.post('/book', verifyToken, async (req, res) => {
    try {
        const { driverId, pickupLocation, dropLocation, rideType, paymentMethod, fare, distance, duration } = req.body;
        const passengerId = req.user.userId;

        if (!pickupLocation || !dropLocation || !rideType || !paymentMethod || !fare || !distance || !duration) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Generate a 4-digit verification code
        const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

        const newBooking = new Booking({
            driverId,
            passengerId,
            pickupLocation,
            dropLocation,
            rideType,
            paymentMethod,
            fare,
            distance,
            duration,
            verificationCode, // Store the verification code
            verificationStatus: 'pending'
        });

        await newBooking.save();

        // Return the verification code to the user in the response
        res.status(201).json({
            message: 'Booking request sent successfully',
            verificationCode: verificationCode,
            bookingId: newBooking._id
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


router.get('/verification-code/:bookingId', verifyToken, async (req, res) => {
    try {
        const { bookingId } = req.params;

        // Find the booking
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Ensure this user is the passenger for this booking
        if (booking.passengerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'This booking does not belong to you' });
        }

        res.status(200).json({
            verificationCode: booking.verificationCode
        });

    } catch (error) {
        console.error('Get verification code error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;