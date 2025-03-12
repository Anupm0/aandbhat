const mongoose = require('mongoose');
const User = require('./modals/user');
const Driver = require('./modals/Driver');
const Admin = require('./modals/Admin');
const Support = require('./modals/SupportTicket');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Helper functions
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate random date within a range
const getRandomDate = (startDate, endDate) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return new Date(start + Math.random() * (end - start));
};

// Common support ticket messages
const userSupportMessages = [
    "My driver didn't show up for the scheduled pickup.",
    "I was charged incorrectly for my last ride.",
    "The app crashed when I was trying to book a ride.",
    "I need help updating my payment information.",
    "My driver took a longer route than necessary.",
    "I left my phone in the car, how can I contact the driver?",
    "I'd like to dispute a cancellation fee that was charged.",
    "The driver was very unprofessional during my ride.",
    "My booking keeps getting canceled automatically.",
    "The estimated fare was much lower than what I was charged.",
    "I need to change my registered mobile number.",
    "The driver arrived at the wrong pickup location.",
    "I accidentally booked a ride for the wrong date.",
    "How do I add multiple stops to my ride?",
    "The driver's car was different from what was shown in the app.",
    "I need help accessing my previous ride receipts.",
    "My promo code isn't working. Can you help?",
    "The driver refused to complete the ride.",
    "I need a refund for my last ride.",
    "How do I set up a corporate account for my business?"
];

const driverSupportMessages = [
    "I'm having issues with the navigation system.",
    "I haven't received my payment for last week's rides.",
    "The app crashed while I was en route to a pickup.",
    "A passenger left items in my car. How do I report this?",
    "I need to update my vehicle information.",
    "The passenger added an unplanned stop that wasn't in the original booking.",
    "I'm unable to go online despite having good internet connection.",
    "I need help understanding my earning statement.",
    "How do I dispute an unfair rating from a passenger?",
    "I'm facing issues with the in-app payment system.",
    "My account was temporarily suspended without explanation.",
    "I need to change my banking details for payouts.",
    "The passenger was verbally abusive during the ride.",
    "I'm unable to access certain areas of the app.",
    "There's an error with my driver profile information.",
    "I couldn't reach the passenger at the pickup point.",
    "My document verification is taking too long.",
    "I need help with tax documents for my earnings.",
    "How do I report unsafe conditions in a certain area?",
    "I'm having trouble scanning the passenger's QR code."
];

// Admin resolution messages
const resolutionMessages = [
    "Issue resolved and refund processed. We apologize for the inconvenience.",
    "After investigating, we've adjusted your fare to the correct amount.",
    "We've contacted the driver regarding this matter and taken appropriate action.",
    "Your account has been updated with the new information.",
    "We've provided additional training to the driver based on your feedback.",
    "A credit has been added to your account for future rides.",
    "The technical issue has been fixed in our latest app update.",
    "We've verified the route taken and found it was optimal given traffic conditions.",
    "We've helped reconnect you with the driver to retrieve your lost item.",
    "Your payment method has been updated successfully.",
    "Your feedback has been recorded and shared with our quality team.",
    "The cancellation fee has been waived as a one-time courtesy.",
    "The driver has been notified about the incorrect vehicle information.",
    "Your corporate account has been set up successfully.",
    "We've manually applied the promo code to your account.",
    "The system error has been identified and fixed.",
    "Your documentation has been re-verified and approved.",
    "The payment has been processed and will reflect in your account within 24 hours.",
    "We've updated our GPS mapping to fix the incorrect location issue.",
    "Your account has been restored to active status."
];

async function createMockSupportTickets(count = 100) {
    try {
        // Delete existing support tickets for clean test data
        await Support.deleteMany({});
        console.log('Cleared existing support tickets');

        // Fetch users, drivers and admins
        const users = await User.find();
        const drivers = await Driver.find();
        const admins = await Admin.find();

        if (users.length === 0) {
            console.error('No users found. Please create some users first.');
            return;
        }

        if (drivers.length === 0) {
            console.warn('No drivers found. Some tickets will be created without driver references.');
        }

        if (admins.length === 0) {
            console.warn('No admins found. Resolved tickets will not have resolver information.');
        }

        const supportTickets = [];
        const today = new Date();
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);

        // Status distribution
        const statusDistribution = {
            'open': 40,    // 40% open
            'viewed': 20,  // 20% viewed
            'resolved': 40 // 40% resolved
        };

        // Create weighted array of statuses
        const statusOptions = [];
        for (const [status, weight] of Object.entries(statusDistribution)) {
            for (let i = 0; i < weight; i++) {
                statusOptions.push(status);
            }
        }

        for (let i = 0; i < count; i++) {
            const isDriverTicket = Math.random() > 0.6; // 40% driver tickets, 60% user tickets
            const status = getRandomElement(statusOptions);
            const createdAt = getRandomDate(threeMonthsAgo, today);

            // Base ticket structure
            const ticket = {
                userId: getRandomElement(users)._id,
                message: isDriverTicket
                    ? getRandomElement(driverSupportMessages)
                    : getRandomElement(userSupportMessages),
                status,
                createdAt
            };

            // Add driver ID for driver-related tickets if drivers exist
            if (isDriverTicket && drivers.length > 0) {
                ticket.driverId = getRandomElement(drivers)._id;
            }

            // Add resolution details for resolved tickets if admins exist
            if (status === 'resolved' && admins.length > 0) {
                ticket.resolvedBy = getRandomElement(admins)._id;
                ticket.resolveMessage = getRandomElement(resolutionMessages);
            }

            // Add viewed status details
            if (status === 'viewed' && admins.length > 0) {
                ticket.resolvedBy = getRandomElement(admins)._id;
            }

            supportTickets.push(ticket);
        }

        // Insert all tickets
        await Support.insertMany(supportTickets);
        console.log(`Successfully created ${supportTickets.length} mock support tickets`);

        // Generate some statistics
        const openCount = supportTickets.filter(t => t.status === 'open').length;
        const viewedCount = supportTickets.filter(t => t.status === 'viewed').length;
        const resolvedCount = supportTickets.filter(t => t.status === 'resolved').length;
        const driverTickets = supportTickets.filter(t => t.driverId).length;
        const userOnlyTickets = supportTickets.filter(t => !t.driverId).length;

        console.log('Mock Support Ticket Statistics:');
        console.log(`- Open tickets: ${openCount}`);
        console.log(`- Viewed tickets: ${viewedCount}`);
        console.log(`- Resolved tickets: ${resolvedCount}`);
        console.log(`- Driver-related tickets: ${driverTickets}`);
        console.log(`- User-only tickets: ${userOnlyTickets}`);

        mongoose.connection.close();
        return { success: true, count: supportTickets.length };

    } catch (error) {
        console.error('Error creating mock support tickets:', error);
        mongoose.connection.close();
        return { success: false, error: error.message };
    }
}

// Execute the function when the script is run directly
if (require.main === module) {
    const ticketCount = process.argv[2] ? parseInt(process.argv[2]) : 100;
    createMockSupportTickets(ticketCount)
        .then(() => console.log('Mock data generation complete'))
        .catch(err => console.error('Failed to generate mock data:', err));
}

// Export for importing in other modules
module.exports = { createMockSupportTickets };