// routes/adminWalletRoutes.js
const express = require('express');
const router = express.Router();
const WalletTransaction = require('../../models/WalletTransaction');
const Users = require('../../modals/user');
const Driver = require('../../modals/Driver');
const verifyTokenAdmin = require('../../helper/utils/verifytokenAdmin');

/**
 * POST update wallet for a user or driver
 * Endpoint: /admin/wallet/update
 * Body parameters:
 *  - accountType: "user" or "driver"
 *  - mobile: the unique identifier (e.g., mobile) for the account
 *  - type: "credit" or "debit"
 *  - amount: Number (transaction amount)
 *  - message: Optional log message
 */
router.post('/update', verifyTokenAdmin, async (req, res) => {
    try {
        const { accountType, mobile, type, amount, message } = req.body;

        if (!accountType || !mobile || !type || !amount) {
            return res.status(400).json({ message: 'accountType, username, type, and amount are required' });
        }

        if (!['credit', 'debit'].includes(type)) {
            return res.status(400).json({ message: 'Invalid transaction type. Must be "credit" or "debit".' });
        }

        let account;
        if (accountType === 'user') {
            account = await Users.findOne({ mobile });
        } else if (accountType === 'driver') {
            account = await Driver.findOne({ mobile });
        } else {
            return res.status(400).json({ message: 'Invalid accountType. Must be "user" or "driver".' });
        }

        if (!account) {
            return res.status(404).json({ message: `${accountType} not found` });
        }

        // For debit transactions, ensure sufficient balance
        if (type === 'debit' && account.wallet.balance < amount) {
            return res.status(400).json({ message: 'Insufficient wallet balance for debit transaction' });
        }

        // Update wallet balance (embedded in the account document)
        account.wallet.balance = type === 'credit'
            ? account.wallet.balance + amount
            : account.wallet.balance - amount;

        // Create a wallet transaction log
        const walletTransaction = new WalletTransaction({
            uid: account._id,
            accountType,
            type,
            amount,
            message: message || ''
        });
        await walletTransaction.save();

        // Save the updated account
        await account.save();

        res.status(200).json({
            message: 'Wallet updated successfully',
            wallet: account.wallet,
            transaction: walletTransaction
        });
    } catch (error) {
        console.error('Error updating wallet:', error);
        res.status(500).json({
            message: 'Failed to update wallet',
            error: error.message
        });
    }
});

/**
 * GET all wallet transactions
 * Endpoint: /admin/wallet/transactions
 * Query parameters: page, limit (for pagination)
 */
router.get('/transactions', verifyTokenAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const transactions = await WalletTransaction.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await WalletTransaction.countDocuments();

        res.status(200).json({
            message: 'Wallet transactions retrieved successfully',
            data: transactions,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching wallet transactions:', error);
        res.status(500).json({
            message: 'Failed to fetch wallet transactions',
            error: error.message
        });
    }
});

module.exports = router;
