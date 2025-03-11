const mongoose = require('mongoose');
require('dotenv').config();

// Import your models
require('./modals/Driver');

const Driver = mongoose.model('Driver');

async function createIndexes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);

        console.log('Creating geospatial index on drivers collection...');
        await Driver.collection.createIndex({ "location": "2dsphere" });

        console.log('Index created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error creating indexes:', error);
        process.exit(1);
    }
}

createIndexes();