const Joi = require('joi');
const mongoose = require('mongoose');

// Custom validation function for ObjectId validation
const objectIdValidation = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid', { value });
    }
    return value;
};

// ----- create vendor -----
const addVendorValidationSchema = Joi.object({

    name: Joi.string().required(),

    email: Joi.string().email().optional(),

    contactNumber: Joi.string().required(),

    alternateNumber: Joi.string().optional(),

    contactPersonName: Joi.string().required(),

    address: Joi.string().optional(),

    isActive: Joi.boolean().default(true),

    createdBy: Joi.string().custom(objectIdValidation, 'User ID validation').default(null),

    createdOn: Joi.date().default(Date.now),

    // isDeleted: Joi.boolean().default(false),

    // deletedBy: Joi.string().custom((value, helpers) => {
    //     if (!mongoose.Types.ObjectId.isValid(value)) {
    //         return helpers.error('any.invalid');
    //     }
    //     return value;
    // }).default(null),

    // deletedOn: Joi.date().default(null)
});


// ----- update vendor -----
const updateVendorValidationSchema = Joi.object({

    vendorId: Joi.string().custom(objectIdValidation, "Vendor ID Validation").required(),

    name: Joi.string().optional(),

    email: Joi.string().email().optional(),

    contactNumber: Joi.string().optional(),

    alternateNumber: Joi.string().optional(),

    contactPersonName: Joi.string().optional(),

    address: Joi.string().optional(),

    isActive: Joi.boolean().optional(),

    isDeleted: Joi.boolean().optional(),

    deletedBy: Joi.string().custom(objectIdValidation, 'User ID validation').optional(),

    deletedOn: Joi.date().optional()
});

module.exports = {
    addVendorValidationSchema,
    updateVendorValidationSchema
};
