const mongoose = require("mongoose");

const activitySchema = mongoose.Schema({
    activityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'activityModel' // Reference path to determine the model dynamically
    },
    activityModel: {
        type: String,
        enum: ['categoryData', 'assetData', 'conditionData', 'locationData', "tagData", "vendorData", "subCategoryData"], // Specify all possible models
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    logs: [{
        old: {

        },
        new: {

        }
    }],
    activity: {
        type: String,
        enum: ["created", "modified"],
        required: true
    },
    actionBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userData",
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    }
}, { timestamps: true })

const Activity = mongoose.model("activityData", activitySchema);
module.exports = Activity;

