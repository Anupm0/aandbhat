const express = require('express');
const verifyTokenAdmin = require('../../helper/utils/verifytokenAdmin');
const User = require('../../modals/user');
const Driver = require('../../modals/Driver');
const Booking = require('../../modals/booking');
const router = express.Router();

router.get('/dashboard-stats', verifyTokenAdmin, async (req, res) => {
    try {
        // Counts for stats cards
        const usersCount = await User.countDocuments();
        const driverCount = await Driver.countDocuments();
        const totalRides = await Booking.countDocuments();

        // Total revenue calculation
        const totalAmountResult = await Booking.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$fare" }
                }
            }
        ]);
        const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

        // Stats cards data
        const statsCards = [
            {
                icon: 'Icons.person',
                value: usersCount.toString(),
                label: 'Total Customers',
                backgroundColor: '0xffFD953B',
            },
            {
                icon: 'Icons.person_add',
                value: driverCount.toString(),
                label: 'Total Driver',
                backgroundColor: '0xff0A84FF',
            },
            {
                icon: 'Icons.receipt_long',
                value: totalRides.toString(),
                label: 'Total Rides',
                backgroundColor: '0xff00A957',
            },
            {
                icon: 'Icons.currency_rupee_outlined',
                value: totalAmount.toString(),
                label: 'Total Revenue',
                backgroundColor: '0xffB2914E',
            }
        ];

        // Ride statistics for pie chart (using correct status values)
        const completedRides = await Booking.countDocuments({ status: 'completed' });
        const cancelledRides = await Booking.countDocuments({ status: 'cancelled' });
        const rideStatistics = { completedRides, cancelledRides };

        // Revenue statistics for line chart (last 9 months)
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const revenueData = [];

        for (let i = 0; i < 9; i++) {
            const targetMonth = (currentMonth - i + 12) % 12;
            const targetYear = currentYear - Math.floor((i - currentMonth) / 12);
            const startDate = new Date(targetYear, targetMonth, 1);
            // End date: last day of the target month
            const endDate = new Date(targetYear, targetMonth + 1, 0);

            const monthlyRevenue = await Booking.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate, $lte: endDate },
                        status: 'completed'
                    }
                },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: "$fare" }
                    }
                }
            ]);

            const revenue = monthlyRevenue.length > 0 ? monthlyRevenue[0].revenue : 0;
            revenueData.push({ x: 9 - i, y: revenue });
        }
        // Reverse to display chronologically (oldest first)
        const revenueChartData = revenueData.reverse();

        // Recent rides table data with proper population and field names
        const recentBookings = await Booking.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('passengerId', 'firstName lastName')
            .populate('driverId', 'firstName lastName');

        const recentRides = recentBookings.map(booking => {
            const pickupDate = new Date(booking.createdAt);
            const formattedDate = `${pickupDate.getDate()} ${pickupDate.toLocaleString('default', { month: 'short' })} ${pickupDate.getFullYear()}, ${pickupDate.getHours()}:${String(pickupDate.getMinutes()).padStart(2, '0')}`;

            return {
                "Ride ID": `ST${booking._id.toString().slice(-9)}`,
                "Rider Name": booking.passengerId
                    ? `${booking.passengerId.firstName || ''} ${booking.passengerId.lastName || ''}`.trim()
                    : "Unknown",
                "Driver Name": booking.driverId
                    ? `${booking.driverId.firstName || ''} ${booking.driverId.lastName || ''}`.trim()
                    : "Unassigned",
                "Pickup and Dropoff": (booking.pickupLocation && booking.dropLocation)
                    ? `${booking.pickupLocation.address || ''} to ${booking.dropLocation.address || ''}`
                    : "Address information unavailable",
                "Pickup Date": formattedDate,
                "Ride Fare": `₹${booking.fare || 0}`,
                "Status": booking.status || "Unknown"
            };
        });

        // Return all data in a single response
        res.status(200).json({
            statsCards,
            rideStatistics,
            revenueChartData,
            recentRides
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
