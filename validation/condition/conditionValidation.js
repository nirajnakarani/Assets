const Joi = require('joi');
const mongoose = require('mongoose');

// Custom validation function for ObjectId validation
const objectIdValidation = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid', { value });
    }
    return value;
};


// ----- create condition -----
const addConditionValidationSchema = Joi.object({


    name: Joi.string().required(),

    description: Joi.string().optional(),

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


// ----- update condition -----
const updateConditionValidationSchema = Joi.object({

    conditionId: Joi.string().custom(objectIdValidation, "Condition ID Validation").required(),

    name: Joi.string().optional(),

    description: Joi.string().optional(),

    // isDefault: Joi.boolean().optional(),

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
    addConditionValidationSchema,
    updateConditionValidationSchema
};
