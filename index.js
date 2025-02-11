// Required dependencies
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');

require('dotenv').config();

const HOST = '0.0.0.0' || 'localhost';

// Initialize express app
const app = express();

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
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Import routes
const authRoutes = require('./router/routelogin');

// Use routes
app.use('/api/auth', authRoutes);

// Basic error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

app.get('/', (req, res) => {
    res.send('Hello World');
}
);





// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "localhost", () => {
    console.log(`Server running on http://${HOST}:${PORT}`);

});