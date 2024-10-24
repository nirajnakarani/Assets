const Joi = require('joi');
const mongoose = require('mongoose');

// Custom validation function for ObjectId validation
const objectIdValidation = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid', { value });
    }
    return value;
};

// ----- create category -----
const addCategoryValidationSchema = Joi.object({

    name: Joi.string().required(),

    description: Joi.string().allow('').optional().default(''),

    icon: Joi.string().optional().default(''),

    color: Joi.string().optional().default(''),

    isActive: Joi.boolean().default(true),

    assetIdType: Joi.number().valid(1, 2).required(), // 1 manual, 2 auto generate

    autoInc: Joi.when('assetIdType', {
        is: 2,
        then: Joi.object({
            prefix: Joi.string().required().default(''),
            number: Joi.string().required().default("0")
        }).required(),
        otherwise: Joi.forbidden()
    }).optional(),

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


// ----- update category -----
const updateCategoryValidationSchema = Joi.object({
    
    categoryId: Joi.string().custom(objectIdValidation, "Category ID Validation").required(),

    name: Joi.string().optional(),

    description: Joi.string().allow('').optional(),

    icon: Joi.string().optional(),

    color: Joi.string().optional(),

    isActive: Joi.boolean().optional(),

    assetIdType: Joi.number().valid(1, 2).optional(), // 1 manual, 2 auto generate

    autoInc: Joi.when('assetIdType', {
        is: 2,
        then: Joi.object({
            prefix: Joi.string().required(),
            number: Joi.string().required()
        }).required(),
        otherwise: Joi.forbidden()
    }).optional(),

    // createdBy: Joi.string().custom((value, helpers) => {
    //     if (!mongoose.Types.ObjectId.isValid(value)) {
    //         return helpers.error('any.invalid');
    //     }
    //     return value;
    // }).optional(),

    // createdOn: Joi.date().optional(),
    
    isDeleted: Joi.boolean().optional(),

    deletedBy: Joi.string().custom(objectIdValidation, 'User ID validation').optional(),

    deletedOn: Joi.date().optional()
});


module.exports = {
    addCategoryValidationSchema,
    updateCategoryValidationSchema
}; 