/**
 * Driver Notification Service
 * Handles broadcasting booking requests to nearby drivers
 */
const socketManager = require('../../helper/utils/socketManager');
const Driver = require('../../modals/Driver');
const User = require('../../modals/user');
const Booking = require('../../modals/booking');

// Store active driver connections
const activeDrivers = new Map();

/**
 * Register a driver connection
 * @param {string} driverId - Driver ID
 * @param {string} socketId - Socket connection ID
 */
function registerDriverConnection(driverId, socketId) {
    activeDrivers.set(driverId, socketId);
    console.log(`Driver ${driverId} connected with socket ${socketId}`);
}

/**
 * Remove a driver connection
 * @param {string} socketId - Socket connection ID
 */
function removeDriverConnection(socketId) {
    for (const [driverId, sid] of activeDrivers.entries()) {
        if (sid === socketId) {
            activeDrivers.delete(driverId);
            console.log(`Driver ${driverId} disconnected`);
            break;
        }
    }
}

/**
 * Broadcast booking request to nearby drivers
 * @param {Array} drivers - Array of driver objects
 * @param {Object} booking - Booking object
 * @param {Object} user - User who made the booking
 */
async function broadcastToNearbyDrivers(drivers, booking, user) {
    // Format user data (removing sensitive info)
    const userData = {
        id: user._id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        rating: await calculateUserRating(user._id)
    };

    // Format booking data
    const bookingData = {
        id: booking._id,
        pickupLocation: booking.pickupLocation,
        dropLocation: booking.dropLocation,
        fare: booking.fare,
        distance: booking.distance,
        duration: booking.duration,
        timestamp: new Date()
    };

    // Notification data to send to drivers
    const notificationData = {
        type: 'NEW_RIDE_REQUEST',
        booking: bookingData,
        user: userData,
        expiresIn: 1 // Seconds until request expires
    };

    // Get io instance from socket manager
    const io = socketManager.getIO();
    if (!io) {
        console.error('Socket.io instance not available');
        return;
    }

    // Track which drivers were actually notified
    const notifiedDrivers = [];

    // Send to each driver
    for (const driver of drivers) {
        const socketId = activeDrivers.get(driver.driverId);

        if (socketId) {
            io.to(socketId).emit('rideRequest', notificationData);
            notifiedDrivers.push(driver.driverId);
            console.log(`Notification sent to driver ${driver.driverId}`);
        } else {
            // Driver is available but not connected via socket
            // Could implement push notification here
            console.log(`Driver ${driver.driverId} is not connected via socket`);
        }
    }

    // Log notification summary
    console.log(`Booking request ${booking._id} sent to ${notifiedDrivers.length} drivers`);

    // Set timeout to handle if no driver accepts
    setTimeout(async () => {
        try {
            // Check if booking is still pending
            const currentBooking = await Booking.findById(booking._id);
            if (currentBooking && currentBooking.status === 'pending') {
                // Update booking status to 'expired'
                currentBooking.status = 'expired';
                await currentBooking.save();

                // Notify user that no driver accepted
                const userSocketId = socketManager.getUserSocket(user._id);
                if (userSocketId) {
                    io.to(userSocketId).emit('bookingUpdate', {
                        type: 'BOOKING_EXPIRED',
                        bookingId: booking._id,
                        message: 'No drivers accepted your request'
                    });
                }
            }
        } catch (error) {
            console.error('Error handling expired booking:', error);
        }
    }, 60000); // 60 seconds
}

/**
 * Calculate user rating based on previous rides
 * @param {string} userId - User ID
 * @returns {number} - Average rating (default 5.0 if no ratings)
 */
async function calculateUserRating(userId) {
    // This would need to be implemented based on your Rating model
    // For now, return a default rating
    return 5.0;
}

module.exports = {
    registerDriverConnection,
    removeDriverConnection,
    broadcastToNearbyDrivers
};