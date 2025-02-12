// Required dependencies
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');
require('dotenv').config();
const HOST = process.env.HOSTNAME || 'localhost';

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    blue: '\x1b[34m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

const app = express();

// Logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    // Log request details
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.blue}📨 REQUEST${colors.reset} [${timestamp}]`);
    console.log(`${colors.green}METHOD${colors.reset}: ${colors.yellow}${req.method}${colors.reset}`);
    console.log(`${colors.green}URL${colors.reset}: ${colors.yellow}${req.url}${colors.reset}`);
    console.log(`${colors.green}IP${colors.reset}: ${colors.yellow}${req.ip}${colors.reset}`);

    // Log headers
    console.log(`${colors.green}HEADERS${colors.reset}:`,
        `${colors.cyan}${JSON.stringify(req.headers, null, 2)}${colors.reset}`);

    // Log body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.password) sanitizedBody.password = '******';
        if (sanitizedBody.otp) sanitizedBody.otp = '******';

        console.log(`${colors.green}BODY${colors.reset}:`,
            `${colors.cyan}${JSON.stringify(sanitizedBody, null, 2)}${colors.reset}`);
    }

    // Log response
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode < 400 ? colors.green : colors.red;

        console.log(`${colors.blue}📡 RESPONSE${colors.reset} [${timestamp}]`);
        console.log(`${colors.green}STATUS${colors.reset}: ${statusColor}${res.statusCode}${colors.reset}`);
        console.log(`${colors.green}DURATION${colors.reset}: ${colors.yellow}${duration}ms${colors.reset}`);
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