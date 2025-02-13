const rideSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    pickupLocation: { type: String, required: true },
    dropoffLocation: { type: String, required: true },
    distance: { type: Number, required: true }, // in km
    fare: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'card', 'wallet'], required: true },
    rideStatus: { type: String, enum: ['completed', 'canceled'], required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true }
}, { timestamps: true });

const Ride = mongoose.model('Ride', rideSchema);
module.exports = Ride;
