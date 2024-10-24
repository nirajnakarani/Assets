const Joi = require('joi');
const mongoose = require('mongoose');

// Custom validation function for ObjectId validation
const objectIdValidation = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid', { value });
    }
    return value;
};

// ----- create location -----
const addLocationValidationSchema = Joi.object({

    name: Joi.string().required(),

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

    // deletedOn: Joi.date().allow(null).default(null)
});

// ----- update location -----
const updateLocationValidationSchema = Joi.object({

    locationId: Joi.string().custom(objectIdValidation, "Location ID Validation").required(),

    name: Joi.string().optional(),

    isActive: Joi.boolean().optional(),

    createdBy: Joi.string().custom((value, helpers) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    }).optional(),

    createdOn: Joi.date().optional(),

    isDeleted: Joi.boolean().optional(),

    deletedBy: Joi.string().custom(objectIdValidation, 'User ID validation').optional(),

    deletedOn: Joi.date().allow(null).optional()
});



module.exports = {
    addLocationValidationSchema,
    updateLocationValidationSchema
};
