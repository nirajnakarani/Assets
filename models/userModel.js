const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    user_img: {
        type: String,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: true
    },
    role: {
        type: Number,
        enum: [1, 2, 3],  // 1 admin  2 manager  3 employee
        default: 3
    },
    isOwner: {
        type: Boolean,
        default: false
    }

}, { timestamps: true })

const User = mongoose.model("userData", userSchema);

module.exports = User