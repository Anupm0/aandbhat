const express = require('express');
const passport = require('passport');
const cors = require('cors');
const connectDB = require('./helper/utils/mongooesdbconnect');
require('dotenv').config();
const logger = require('./helper/utils/Logger');
const http = require('http');
const app = express();
const server = http.createServer(app);

// Import models to ensure schemas are created
require('./modals/Driver');
require('./modals/DriverCategories');
require('./modals/WorkLog');
require('./modals/Rating');
require('./modals/user');
require('./modals/Admin');
require('./modals/booking');
require('./modals/MessageSchema');

// Initialize socket manager with server
const socketManager = require('./helper/utils/socketManager');
const io = socketManager.initialize(server);

// Logging middleware
app.use((req, res, next) => {
    logger.logRequest(req);
    res.on('finish', () => logger.logResponse(req, res));
    next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(
    {
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true
    }
));

app.use(passport.initialize());

// Connect to MongoDB
connectDB(process.env.MONGODB_URI);

// Import routes
const authRoutes = require('./router/User/routelogin');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api', require('./router/User/rateDriver')); // /rate-driver endpoint 

app.use('/api/profile', require('./router/User/Profile'));
app.use('/api/admin', require('./router/Admin/Authentication'));
app.use('/api/auth/driver', require('./router/driver/loginSignup'));
app.use('/api/driver', require('./router/driver/profile'));
app.use('/api/driver', require('./router/driver/ActiveStatus'));
app.use('/api/driver', require('./router/driver/UpdateLocation'));

// Add our new routes
app.use('/api', require('./router/User/FindDriver')); // New FindDriver route
app.use('/api/driver', require('./router/driver/AcceptRide')); // New AcceptRide route
app.use('/api/user', require('./router/User/booking'))
app.use('/api/category', require('./router/Admin/DriverCategoryManagement'));


// Basic error handling






app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.use(require('./router/assets/categoryImage'));


// Configure socket.io for messaging
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Handle driver location updates
    socket.on('updateDriverLocation', async (data) => {
        try {
            if (!socket.driverId) {
                socket.emit('error', { message: 'Authentication required' });
                return;
            }

            const { latitude, longitude } = data;
            if (!latitude || !longitude) {
                socket.emit('error', { message: 'Invalid location data' });
                return;
            }

            // Update driver location in database
            const Driver = require('./modals/Driver');
            await Driver.findOneAndUpdate(
                { driverId: socket.driverId },
                {
                    location: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    }
                }
            );

            socket.emit('locationUpdated', { success: true });
        } catch (error) {
            console.error('Error updating driver location:', error);
            socket.emit('error', { message: 'Failed to update location' });
        }
    });

    // Join a room based on booking ID
    socket.on('join-room', (bookingId) => {
        socket.join(bookingId);
        console.log(`Socket ${socket.id} joined room ${bookingId}`);
    });

    // Handle incoming messages
    socket.on('send-message', async (messageData) => {
        try {
            const { bookingId, senderId, senderType, receiverId, receiverType, text } = messageData;
            const Message = require('./modals/MessageSchema');

            // Create and save message to database
            const message = new Message({
                bookingId,
                senderId,
                senderType,
                receiverId,
                receiverType,
                text
            });

            await message.save();

            // Emit the message to everyone in the room
            io.to(bookingId).emit('new-message', message);
        } catch (error) {
            console.error('Error handling message:', error);
            socket.emit('error', { message: 'Error sending message' });
        }
    });

    // Handle ride request responses from drivers
    socket.on('ride-response', async (data) => {
        try {
            const { bookingId, response, driverId } = data;

            if (!driverId || !bookingId) {
                socket.emit('error', { message: 'Missing required fields' });
                return;
            }

            if (response === 'accept') {
                // Driver accepts the ride
                // This would call our AcceptRide endpoint logic
                const Booking = require('./modals/booking');
                const booking = await Booking.findById(bookingId);

                if (!booking || booking.status !== 'pending') {
                    socket.emit('error', { message: 'Booking is no longer available' });
                    return;
                }

                // Process the acceptance (simplified - actual logic in AcceptRide controller)
                booking.driverId = driverId;
                booking.status = 'accepted';
                booking.acceptedAt = new Date();
                await booking.save();

                // Notify the user
                const userSocketId = socketManager.getUserSocket(booking.passengerId);
                if (userSocketId) {
                    io.to(userSocketId).emit('booking-accepted', {
                        bookingId: booking._id,
                        driverId: driverId
                    });
                }

                socket.emit('response-processed', { success: true });
            }
        } catch (error) {
            console.error('Error processing ride response:', error);
            socket.emit('error', { message: 'Failed to process response' });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server started on host ${process.env.HOST || '0.0.0.0'} and port ${PORT}`);

    // List all available routes
    app._router.stack.forEach((r) => {
        if (r.route && r.route.path) {
            console.log(r.route.path);
        }
    });
});