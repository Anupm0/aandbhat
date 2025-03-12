const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'driver' },
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'viewed', 'resolved'], default: 'open' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'admin' },
    resolveMessage: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Support = mongoose.model('Support', supportSchema);


module.exports = Support;