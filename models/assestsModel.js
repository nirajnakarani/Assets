const mongoose = require("mongoose");
// const Category = require("./categoryModel");

const assetsSchema = mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "categoryData",
        required: true,
        default: null
    },
    subCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subCategoryData",
        required: true,
        default: null
    },

    assetId: {
        type: String,
        required: true
    },

    name: {
        type: String,
        required: true
    },

    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "vendorData",
        default: null
    },

    purchasedOn: {
        type: Date,
        default: null
    },

    serialNumber: {
        type: String,
        default: "",
    },

    expireDateWarranty: {
        type: Date,
        default: null
    },

    expireWarrantyNotify: {
        type: String
    },

    price: {
        type: Number,
        default: 0
    },

    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "locationData",
        default: null
    },

    tag: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "tagData",
        default: null
    },

    condition: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "conditionData",
        default: null
    },

    assignTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userData",
        default: null
    },

    assignBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userData",
        default: null
    },

    isAssign: {
        type: Boolean,
        default: false
    },

    assignAt: {
        type: Date,
    },

    description: {
        type: String,
        default: ""
    },
    files: {
        type: [{}],
        default: []
    },
    note: {
        type: String,
        default: ""
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

    isActive: {
        type: Boolean,
        default: true
    },

    isImport: {
        type: Boolean,
        default: false
    },

    isAssociate: {
        type: Boolean,
        default: false
    },

    assignAssets: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "assetData",
        default: null
    },

    associate: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "assetData",
        default: []
    },

    status: {
        type: Number,
        enum: [1, 2, 3, 4],  //1 available  2 unavalilabe  3 assigned  4 associated
        default: 1
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
    },

    lastAuditDate: {
        type: Date,
        default: null
    }

}, { timestamps: true });

// function padNumber(number, length) {
//     return number.toString().padStart(length, '0');
// }

// assetsSchema.pre('save', async function (next) {
//     const asset = this;

//     // Find the related category
//     const category = await Category.findById(asset.category);

//     if (category && category.assetIdType == 2) {
//         // Increment the number in the category
//         const incrementedNumber = parseInt(category.autoInc.number) + 1;
//         category.autoInc.number = padNumber(incrementedNumber, category.autoInc.number.length);

//         await category.save();
//     }

//     next();
// });

const Asset = mongoose.model("assetData", assetsSchema);

module.exports = Asset;