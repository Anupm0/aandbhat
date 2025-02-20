// Required dependencies
const express = require('express');
const passport = require('passport');
const cors = require('cors');
const connectDB = require('./helper/utils/mongooesdbconnect');
require('dotenv').config();
const logger = require('./helper/utils/Logger');

// Import models to ensure schemas are created
require('./modals/Driver');
require('./modals/DriverCategories');
require('./modals/History');
require('./modals/Rating');
require('./modals/user');
require('./modals/Admin');
const app = express();

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







connectDB(process.env.MONGODB_URI);






// Import routes
const authRoutes = require('./router/User/routelogin');



// Use routes
app.use('/api/auth', authRoutes);

app.use('/api/profile', require('./router/User/Profile'));
app.use('/api/admin', require('./router/Admin/Authentication'));

app.use('/api/driver', require('./router/driver/category'))


// Basic error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

app.get('/', (req, res) => {
    res.send('Hello World');
}
);


app.use(require('./router/assets/categoryImage'))





// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

