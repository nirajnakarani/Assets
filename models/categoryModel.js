const mongoose = require("mongoose");

const categorySchema = mongoose.Schema({
    name: {
        type: String
    },
    description: {
        type: String
    },
    icon: {
        type: String
    },
    color: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    assetIdType: {
        type: Number,
        enum: [1, 2]  // 1 manual  2 auto generate
    },
    autoInc: {
        prefix: {
            type: String,
            default: ''
        },
        number: {
            type: String,
            default: "0"
        }
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

categorySchema.pre("save", function(next) {
    if (this.isModified('assetIdType') && this.assetIdType == 1) {
        this.autoInc.prefix = '';
        this.autoInc.number = '0';
        
        // Mark autoInc fields as modified
        this.markModified('autoInc');
    }
    next();
});


const Category = mongoose.model("categoryData", categorySchema)

module.exports = Category