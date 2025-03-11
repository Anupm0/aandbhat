/**
 * Socket Manager
 * Manages socket.io connections and provides a central API to interact with them
 */
const jwt = require('jsonwebtoken');
const User = require('../../modals/user');
const Driver = require('../../modals/Driver');

// Store for socket connections
let io = null;
const userSockets = new Map(); // userId -> socketId
const driverSockets = new Map(); // driverId -> socketId

/**
 * Initialize Socket.IO with server instance
 * @param {Object} server - HTTP server instance
 */
function initialize(server) {
    io = require('socket.io')(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', handleConnection);
    return io;
}

/**
 * Get the Socket.IO instance
 * @returns {Object} - Socket.IO instance
 */
function getIO() {
    return io;
}

/**
 * Handle new socket connection
 * @param {Object} socket - Socket.IO socket
 */
function handleConnection(socket) {
    console.log(`New socket connection: ${socket.id}`);

    // Handle authentication on connection
    socket.on('authenticate', async (data) => {
        try {
            const { token, userType } = data;

            if (!token) {
                socket.emit('error', { message: 'Authentication token is required' });
                return;
            }

            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (userType === 'driver') {
                // Authenticate as driver
                const driver = await Driver.findById(decoded.userId);
                if (!driver) {
                    socket.emit('error', { message: 'Driver not found' });
                    return;
                }

                // Store driver socket
                driverSockets.set(driver.driverId, socket.id);
                socket.driverId = driver.driverId;

                socket.emit('authenticated', { driverId: driver.driverId });
                console.log(`Driver ${driver.driverId} authenticated on socket ${socket.id}`);
            } else {
                // Authenticate as user
                const user = await User.findById(decoded.userId);
                if (!user) {
                    socket.emit('error', { message: 'User not found' });
                    return;
                }

                // Store user socket
                userSockets.set(user._id.toString(), socket.id);
                socket.userId = user._id.toString();

                socket.emit('authenticated', { userId: user._id });
                console.log(`User ${user._id} authenticated on socket ${socket.id}`);
            }
        } catch (error) {
            console.error('Socket authentication error:', error);
            socket.emit('error', { message: 'Authentication failed' });
        }
    });

    // Handle location updates from drivers
    socket.on('updateLocation', async (data) => {
        if (!socket.driverId) {
            socket.emit('error', { message: 'Authentication required' });
            return;
        }

        try {
            const { latitude, longitude } = data;

            if (!latitude || !longitude) {
                socket.emit('error', { message: 'Latitude and longitude are required' });
                return;
            }

            // Update driver location in database
            await Driver.findOneAndUpdate(
                { driverId: socket.driverId },
                {
                    location: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    }
                }
            );

            socket.emit('locationUpdated');
        } catch (error) {
            console.error('Location update error:', error);
            socket.emit('error', { message: 'Failed to update location' });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        if (socket.userId) {
            userSockets.delete(socket.userId);
            console.log(`User ${socket.userId} disconnected`);
        }

        if (socket.driverId) {
            driverSockets.delete(socket.driverId);
            console.log(`Driver ${socket.driverId} disconnected`);
        }
    });
}

/**
 * Get socket ID for a user
 * @param {string} userId - User ID
 * @returns {string|null} - Socket ID or null if not found
 */
function getUserSocket(userId) {
    return userSockets.get(userId.toString());
}

/**
 * Get socket ID for a driver
 * @param {string} driverId - Driver ID
 * @returns {string|null} - Socket ID or null if not found
 */
function getDriverSocket(driverId) {
    return driverSockets.get(driverId);
}

module.exports = {
    initialize,
    getIO,
    getUserSocket,
    getDriverSocket
};