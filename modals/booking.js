const mongoose = require('mongoose');



const bookingSchema = new mongoose.Schema({
    passengerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },
    pickupLocation: {
        address: { type: String, required: true },
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
    dropLocation: {
        address: { type: String, required: true },
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
    serviceTypeCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'drivercategories'
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'expired'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'wallet'],
        default: 'cash'
    },
    fare: {
        type: Number,
        required: true
    },
    distance: {
        type: Number,
        required: true  // in kilometers
    },
    duration: {
        type: Number,
        required: true  // in minutes
    },
    notes: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    acceptedAt: {
        type: Date
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    cancelledAt: {
        type: Date
    },
    cancelledBy: {
        type: String,
        enum: ['passenger', 'driver', 'system']
    },
    cancellationReason: {
        type: String
    },
    verificationCode: {
        type: String,
        default: function () {
            return Math.floor(1000 + Math.random() * 9000).toString();
        }
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified'],
        default: 'pending'
    }
});

bookingSchema.index({ 'pickupLocation.coordinates': '2dsphere' });
bookingSchema.index({ passengerId: 1, createdAt: -1 });
bookingSchema.index({ driverId: 1, createdAt: -1 });
bookingSchema.index({ status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;