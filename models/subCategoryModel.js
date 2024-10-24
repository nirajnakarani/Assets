const mongoose = require("mongoose");

const subCategorySchema = mongoose.Schema({
    name: {
        type: String
    },
    description: {
        type: String
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "categoryData",
        require: true
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



const SubCategory = mongoose.model("subCategoryData", subCategorySchema)

module.exports = SubCategory