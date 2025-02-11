// Required dependencies
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');

require('dotenv').config();












const HOST = process.env.HOSTNAME || 'localhost';

// Initialize express app

const app = express();





app.use((req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    // Log request details
    console.log('\n' + '='.repeat(80));
    console.log(`${chalk.blue('📨 REQUEST')} [${timestamp}]`);
    console.log(`${chalk.green('METHOD')}: ${chalk.yellow(req.method)}`);
    console.log(`${chalk.green('URL')}: ${chalk.yellow(req.url)}`);
    console.log(`${chalk.green('IP')}: ${chalk.yellow(req.ip)}`);

    // Log headers
    console.log(`${chalk.green('HEADERS')}:`, chalk.cyan(JSON.stringify(req.headers, null, 2)));

    // Log body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        // Remove sensitive data like passwords
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.password) sanitizedBody.password = '******';
        if (sanitizedBody.otp) sanitizedBody.otp = '******';

        console.log(`${chalk.green('BODY')}:`, chalk.cyan(JSON.stringify(sanitizedBody, null, 2)));
    }

    // Log response
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode < 400 ? chalk.green : chalk.red;

        console.log(`${chalk.blue('📡 RESPONSE')} [${timestamp}]`);
        console.log(`${chalk.green('STATUS')}: ${statusColor(res.statusCode)}`);
        console.log(`${chalk.green('DURATION')}: ${chalk.yellow(duration + 'ms')}`);
        console.log('='.repeat(80));
    });

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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});