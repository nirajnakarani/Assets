const mongoose = require("mongoose");

const uacSchema = mongoose.Schema({
    name: {
        type: String,
    },
    description: {
        type: String
    },
    UACType: {
        type: Number,
        enum: [1, 2, 3],  // 1 admin  2 manager  3 employee
        default: 3
    },
    activeCount: {
        type: Number,
        default: 0
    },
    assignEmployee: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "userData",
    },
    UAC: {
        type: Object,
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userData",
        default: null
    },
    createdOn: {
        type: Date,
        default: Date.now
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userData",
        default: null
    },
    deletedOn: {
        type: Date,
        default: null
    }
}, { timestamps: true });

const UAC = mongoose.model("uacData", uacSchema);

module.exports = UAC;