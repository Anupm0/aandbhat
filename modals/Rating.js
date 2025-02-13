const ratingSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String, default: "" },
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
    createdAt: { type: Date, default: Date.now }
});

const Rating = mongoose.model('Rating', ratingSchema);
module.exports = Rating;
