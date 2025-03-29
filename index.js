const express = require('express');
const passport = require('passport');
const cors = require('cors');
const connectDB = require('./helper/utils/mongooesdbconnect');
require('dotenv').config();
const logger = require('./helper/utils/Logger');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Set up CORS options
const corsOptions = {
    origin: 'https://www.drvvy.com', // Allowed origin (adjust if needed)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply CORS middleware early, and handle preflight requests
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Logging middleware
app.use((req, res, next) => {
    logger.logRequest(req);
    res.on('finish', () => logger.logResponse(req, res));
    next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// Connect to MongoDB
connectDB(process.env.MONGODB_URI);

// Import models (to ensure schemas are created)
require('./modals/Driver');
require('./modals/DriverCategories');
require('./modals/WorkLog');
require('./modals/Rating');
require('./modals/user');
require('./modals/Admin');
require('./modals/booking');
require('./modals/MessageSchema');
require('./modals/SupportTicket');

// Import routes
const authRoutes = require('./router/User/routelogin');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api', require('./router/User/rateDriver'));
app.use('/api/profile', require('./router/User/Profile'));
app.use('/api/admin', require('./router/Admin/Authentication'));
app.use('/api/auth/driver', require('./router/driver/loginSignup'));
app.use('/api/driver', require('./router/driver/profile'));
app.use('/api/driver', require('./router/driver/ActiveStatus'));
app.use('/api/driver', require('./router/driver/UpdateLocation'));
app.use('/api', require('./router/User/FindDriver'));
app.use('/api/driver', require('./router/driver/AcceptRide'));
app.use('/api/user', require('./router/User/booking'));
app.use('/api/category', require('./router/Admin/DriverCategoryManagement'));
app.use('/api/admin', require('./router/Admin/Stats'));
app.use('/api/admin', require('./router/Admin/Utility'));
app.use('/api/admin/users', require('./router/Admin/UsersManagement'));
app.use('/api/admin/drivers', require('./router/Admin/DriversManagement'));
app.use('/api/admin', require('./router/Admin/SupportTicket'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Additional asset routes
app.use(require('./router/assets/categoryImage'));

// Mount chat routes
app.use('/api', require('./router/Chats/Chat'));

// Error handling middleware (should be after routes)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Base route
app.get('/', (req, res) => {
    res.send('Hello World');
});

// Initialize Socket.io with CORS configuration
const socketManager = require('./helper/utils/socketManager');
const io = socketManager.initialize(server, {
    cors: {
        origin: 'https://www.drvvy.com', // Allowed origin for socket connections
        methods: ['GET', 'POST'],
        credentials: true,
    }
});

// Initialize chat socket events if applicable
require('./router/Chats/Chat').initializeSocket(io);

// Additional socket events
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

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

    socket.on('ride-response', async (data) => {
        try {
            const { bookingId, response, driverId } = data;
            if (!driverId || !bookingId) {
                socket.emit('error', { message: 'Missing required fields' });
                return;
            }
            if (response === 'accept') {
                const Booking = require('./modals/booking');
                const booking = await Booking.findById(bookingId);
                if (!booking || booking.status !== 'pending') {
                    socket.emit('error', { message: 'Booking is no longer available' });
                    return;
                }
                booking.driverId = driverId;
                booking.status = 'accepted';
                booking.acceptedAt = new Date();
                await booking.save();
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

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server started on host ${process.env.HOST || '0.0.0.0'} and port ${PORT}`);
    app._router.stack.forEach((r) => {
        if (r.route && r.route.path) {
            console.log(r.route.path);
        }
    });
});
