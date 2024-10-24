const mongoose = require("mongoose");

const importAssetSchema = mongoose.Schema({
    importBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userData",
        default: null
    },
    ImportDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: Number,
        required: true,
        enum: [1, 2, 3]  // 1.fail  2.pending  3.complete  
    },
    fileName: {
        type: String,
        required: true
    },
    fileURL: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userData",
        default: null
    },
}, { timestamps: true });

const importAssetData = mongoose.model("importAssetData", importAssetSchema);

module.exports = importAssetData;