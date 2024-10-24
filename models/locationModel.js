const mongoose = require("mongoose");

const locationSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
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

const Location = mongoose.model("locationData", locationSchema);

module.exports = Location;