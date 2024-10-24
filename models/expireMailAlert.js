const mongoose = require("mongoose");

const expireMailAlertSchema = mongoose.Schema({
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "locationData",
        default: null
    },
    userList: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "userData",
        default: null
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

const ExpireMailAlert = mongoose.model("expireMailAlertData", expireMailAlertSchema);

module.exports = ExpireMailAlert;