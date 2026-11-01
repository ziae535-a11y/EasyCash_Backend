const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = "mongodb+srv://ziae535_db_user:lasanisarkar1@easycashdb.jjsfo7g.mongodb.net/EasyCashDB";

mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas successfully!"))
  .catch((err) => console.error("MongoDB connection error:", err));

// 1. User Database Schema
const userSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, unique: true },
    CNIC: String,
    dob: String,
    cnicExpiry: String,
    gmail: String,
    pin: String,
    Balance: Number,
    IBAN: String
});
const User = mongoose.model('User', userSchema, 'User');

// 2. Transaction Database Schema (Route se pehle define karna lazmi hai)
const transactionSchema = new mongoose.Schema({
    senderPhone: String,
    receiverPhone: String,
    amount: Number,
    date: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', transactionSchema, 'Transaction');

// 3. User Registration Route (POST)
app.post('/api/users', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).json({ success: true, message: "User registered successfully!" });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// 4. Get User by Phone Route (GET - Login ke liye)
app.get('/api/users/:phone', async (req, res) => {
    try {
        const cleanPhone = req.params.phone.trim();
        const user = await User.findOne({ phone: cleanPhone });
        
        if (!user) {
            console.log("User not found for phone:", cleanPhone);
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Money Transfer Route (POST)
app.post('/api/transfer', async (req, res) => {
    try {
        const { senderPhone, receiverPhone, amount } = req.body;

        if (!senderPhone || !receiverPhone || !amount) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        if (senderPhone === receiverPhone) {
            return res.status(400).json({ success: false, message: "Cannot transfer to your own account" });
        }

        const sender = await User.findOne({ phone: senderPhone });
        const receiver = await User.findOne({ phone: receiverPhone });

        if (!sender) {
            return res.status(404).json({ success: false, message: "Sender not found" });
        }
        if (!receiver) {
            return res.status(404).json({ success: false, message: "Receiver not found" });
        }

        if (sender.Balance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient Balance!" });
        }

        // Deduct from sender and add to receiver
        sender.Balance -= amount;
        receiver.Balance += amount;

        await sender.save();
        await receiver.save();

        // Save transaction history in MongoDB
        const newTransaction = new Transaction({ 
            senderPhone, 
            receiverPhone, 
            amount 
        });
        await newTransaction.save();

        res.status(200).json({ success: true, message: "Transfer successful!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});