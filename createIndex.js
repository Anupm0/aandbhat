const mongoose = require('mongoose');
const User = require('./modals/user');
const Driver = require('./modals/Driver');
const Booking = require('./modals/booking');
const driverCategory = require('./modals/DriverCategories');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Mumbai area coordinates (for realistic data)
const mumbaiCoordinates = [
    { name: "Andheri", coords: [72.8777, 19.1136], address: "Andheri, Mumbai" },
    { name: "Bandra", coords: [72.8296, 19.0596], address: "Bandra, Mumbai" },
    { name: "Colaba", coords: [72.8265, 18.9067], address: "Colaba, Mumbai" },
    { name: "Dadar", coords: [72.8410, 19.0178], address: "Dadar, Mumbai" },
    { name: "Juhu", coords: [72.8296, 19.1075], address: "Juhu, Mumbai" },
    { name: "Malad", coords: [72.8512, 19.1862], address: "Malad, Mumbai" },
    { name: "Powai", coords: [72.9088, 19.1164], address: "Powai, Mumbai" },
    { name: "Worli", coords: [72.8240, 18.9986], address: "Worli, Mumbai" }
];

// Random helper functions
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

// Generate random date within a range
const getRandomDate = (startDate, endDate) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return new Date(start + Math.random() * (end - start));
};

// Calculate distance between two coordinates (in km) using Haversine formula
const calculateDistance = (coord1, coord2) => {
    const toRadians = (degrees) => degrees * Math.PI / 180;
    const R = 6371; // Earth's radius in km

    const dLat = toRadians(coord2[1] - coord1[1]);
    const dLon = toRadians(coord2[0] - coord1[0]);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(coord1[1])) * Math.cos(toRadians(coord2[1])) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

async function createMockBookings() {
    try {
        // Delete existing bookings for clean test data
        await Booking.deleteMany({});
        console.log('Cleared existing bookings');

        // Get existing users, drivers and categories
        const users = await User.find();
        const drivers = await Driver.find();
        const categories = await driverCategory.find();

        if (users.length === 0) {
            console.error('No users found. Please create some users first.');
            return;
        }

        if (drivers.length === 0) {
            console.error('No drivers found. Please create some drivers first.');
            return;
        }

        if (categories.length === 0) {
            console.error('No driver categories found.');
            // We'll continue without categories if none exist
        }

        const statusWeights = {
            'pending': 5,
            'accepted': 5,
            'in_progress': 5,
            'completed': 70, // Higher weight for completed rides
            'cancelled': 10,
            'expired': 5
        };

        const statusOptions = [];
        for (const [status, weight] of Object.entries(statusWeights)) {
            for (let i = 0; i < weight; i++) {
                statusOptions.push(status);
            }
        }

        const bookings = [];
        const today = new Date();

        // Create bookings for the past 12 months
        for (let i = 0; i < 300; i++) { // Create 300 bookings
            const startDate = new Date(today);
            startDate.setMonth(today.getMonth() - 12); // Start from 12 months ago

            const createdAt = getRandomDate(startDate, today);
            const pickupLocation = getRandomElement(mumbaiCoordinates);
            let dropLocation;

            // Make sure pickup and drop locations are different
            do {
                dropLocation = getRandomElement(mumbaiCoordinates);
            } while (pickupLocation.name === dropLocation.name);

            // Calculate distance between pickup and dropoff
            const distance = calculateDistance(pickupLocation.coords, dropLocation.coords);

            // Calculate duration based on average speed of 30 km/h
            const duration = Math.round((distance / 30) * 60); // Convert to minutes

            const status = getRandomElement(statusOptions);

            // Calculate fare based on distance and duration
            // Base fare: ₹50 + ₹15 per km + ₹2 per minute
            const fare = Math.round(50 + (distance * 15) + (duration * 2));

            const booking = {
                passengerId: getRandomElement(users)._id,
                driverId: status === 'pending' ? null : getRandomElement(drivers)._id,
                pickupLocation: {
                    address: pickupLocation.address,
                    type: 'Point',
                    coordinates: pickupLocation.coords
                },
                dropLocation: {
                    address: dropLocation.address,
                    type: 'Point',
                    coordinates: dropLocation.coords
                },
                serviceTypeCategory: categories.length > 0 ? getRandomElement(categories)._id : null,
                status: status,
                paymentMethod: getRandomElement(['cash', 'card', 'wallet']),
                fare: fare,
                distance: distance,
                duration: duration,
                notes: Math.random() > 0.7 ? `Test ride note ${i}` : null,
                createdAt: createdAt
            };

            // Add status-specific timestamps
            if (status === 'accepted' || status === 'in_progress' || status === 'completed') {
                booking.acceptedAt = new Date(createdAt.getTime() + getRandomInt(1, 5) * 60000);
            }

            if (status === 'in_progress' || status === 'completed') {
                booking.startedAt = new Date(booking.acceptedAt.getTime() + getRandomInt(5, 15) * 60000);
            }

            if (status === 'completed') {
                booking.completedAt = new Date(booking.startedAt.getTime() + duration * 60000);
                booking.verificationStatus = 'verified';
            }

            if (status === 'cancelled') {
                booking.cancelledAt = new Date(createdAt.getTime() + getRandomInt(1, 10) * 60000);
                booking.cancelledBy = getRandomElement(['passenger', 'driver', 'system']);
                booking.cancellationReason = `Test cancellation reason ${i}`;
            }

            bookings.push(booking);
        }

        // Insert all bookings
        await Booking.insertMany(bookings);
        console.log(`Successfully created ${bookings.length} mock bookings`);

        // Generate some statistics
        const completedCount = bookings.filter(b => b.status === 'completed').length;
        const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;
        const totalRevenue = bookings.filter(b => b.status === 'completed')
            .reduce((sum, booking) => sum + booking.fare, 0);

        console.log('Mock Data Statistics:');
        console.log(`- Completed rides: ${completedCount}`);
        console.log(`- Cancelled rides: ${cancelledCount}`);
        console.log(`- Total revenue: ₹${totalRevenue}`);

        mongoose.connection.close();

    } catch (error) {
        console.error('Error creating mock bookings:', error);
        mongoose.connection.close();
    }
}

createMockBookings();