const mongoose = require("mongoose");

const vendorSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String
    },
    contactNumber: {
        type: String,
        required: true
    },
    alternateNumber: {
        type: String
    },
    contactPersonName: {
        type: String,
        required: true
    },
    address: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
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

const Vendor = mongoose.model("vendorData", vendorSchema);

module.exports = Vendor;