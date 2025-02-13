const mongoose = require('mongoose');

const options = {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
};

async function connectDB(uri) {
    try {
        await mongoose.connect(uri, options);
        console.log('Connected to MongoDB');

        mongoose.connection.on('error', err => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected. Attempting to reconnect...');
        });
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
}

module.exports = connectDB;