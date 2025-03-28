const express = require('express');
const passport = require('passport');
const cors = require('cors');
const connectDB = require('./helper/utils/mongooesdbconnect');
require('dotenv').config();
const logger = require('./helper/utils/Logger');
const http = require('http');
const app = express();
const path = require('path');
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
require('./modals/SupportTicket');


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
app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));

app.use(passport.initialize());

// Connect to MongoDB
connectDB(process.env.MONGODB_URI);

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

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.use(require('./router/assets/categoryImage'));

// Mount chat routes and initialize chat socket events
app.use('/api', require('./router/Chats/Chat'));
require('./router/Chats/Chat').initializeSocket(io);

// Additional socket events for other features remain here
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server started on host ${process.env.HOST || '0.0.0.0'} and port ${PORT}`);
    app._router.stack.forEach((r) => {
        if (r.route && r.route.path) {
            console.log(r.route.path);
        }
    });
});
