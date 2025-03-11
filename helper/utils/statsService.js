/**
 * Statistics Service
 * Provides metrics for drivers and users
 */
const Booking = require('../../modals/booking');
const Rating = require('../../modals/Rating');
const WorkLog = require('../../modals/WorkLog');

/**
 * Get driver statistics
 * @param {string} driverId - Driver ID 
 * @param {Object} options - Options for filtering (e.g. timeframe)
 * @returns {Object} Driver statistics
 */
async function getDriverStats(driverId, options = {}) {
    try {
        const { startDate, endDate } = options;

        // Define date filter if provided
        const dateFilter = {};
        if (startDate) {
            dateFilter.createdAt = { $gte: new Date(startDate) };
        }
        if (endDate) {
            dateFilter.createdAt = { ...dateFilter.createdAt, $lte: new Date(endDate) };
        }

        // Query for all completed rides by this driver
        const completedRides = await Booking.find({
            driverId,
            status: 'completed',
            ...dateFilter
        });

        // Get ratings for this driver
        const ratings = await Rating.find({
            driverId,
            ...dateFilter
        });

        // Calculate metrics
        const totalRides = completedRides.length;
        const totalEarnings = completedRides.reduce((sum, ride) => sum + ride.fare, 0);
        const totalDistance = completedRides.reduce((sum, ride) => sum + ride.distance, 0);
        const averageRating = ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length
            : 0;

        // Calculate acceptance rate (if we tracked rejections)
        // This would require additional tracking of ride offers

        // Get recent work logs
        const workLogs = await WorkLog.find({
            driverId,
            ...dateFilter
        }).sort({ date: -1 });

        // Calculate total hours worked
        const totalHoursWorked = workLogs.reduce(
            (sum, log) => sum + (log.totalHoursWorked || 0),
            0
        );

        return {
            totalRides,
            totalEarnings,
            totalDistance,
            averageRating,
            totalHoursWorked,
            earningsPerHour: totalHoursWorked > 0 ? totalEarnings / totalHoursWorked : 0,
            // Add more metrics as needed
        };
    } catch (error) {
        console.error('Error getting driver stats:', error);
        throw error;
    }
}

/**
 * Get user ride history
 * @param {string} userId - User ID
 * @param {Object} options - Options for filtering
 * @returns {Array} Ride history
 */
async function getUserRideHistory(userId, options = {}) {
    try {
        const { limit = 10, page = 1, status } = options;
        const skip = (page - 1) * limit;

        // Create query
        const query = { passengerId: userId };

        // Add status filter if provided
        if (status) {
            query.status = status;
        }

        // Query for rides
        const rides = await Booking.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('driverId', 'firstName lastName driverId mobile')
            .lean();

        // Get total count for pagination
        const total = await Booking.countDocuments(query);

        return {
            rides,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('Error getting user ride history:', error);
        throw error;
    }
}

/**
 * Get driver ride history
 * @param {string} driverId - Driver ID
 * @param {Object} options - Options for filtering
 * @returns {Array} Ride history
 */
async function getDriverRideHistory(driverId, options = {}) {
    try {
        const { limit = 10, page = 1, status } = options;
        const skip = (page - 1) * limit;

        // Create query
        const query = { driverId };

        // Add status filter if provided
        if (status) {
            query.status = status;
        }

        // Query for rides
        const rides = await Booking.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('passengerId', 'firstName lastName mobile')
            .lean();

        // Get total count for pagination
        const total = await Booking.countDocuments(query);

        return {
            rides,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('Error getting driver ride history:', error);
        throw error;
    }
}

module.exports = {
    getDriverStats,
    getUserRideHistory,
    getDriverRideHistory
};