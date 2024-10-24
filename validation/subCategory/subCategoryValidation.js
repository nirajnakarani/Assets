const Joi = require('joi');
const mongoose = require('mongoose');

// Custom validation function for ObjectId validation
const objectIdValidation = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid', { value });
    }
    return value;
};


// ----- Create Sub Category -----
const addSubCategoryValidationSchema = Joi.object({

    name: Joi.string().required(),

    description: Joi.string().optional().allow(""),

    category: Joi.string().custom(objectIdValidation, 'Category ID validation').required(),

    createdBy: Joi.string().custom(objectIdValidation, 'User ID validation').default(null),

    createdOn: Joi.date().default(Date.now),

});

// ----- Update Sub Category -----
const updateSubCategoryValidationSchema = Joi.object({

    subCategoryId: Joi.string().custom(objectIdValidation, "Sub Category ID Validation").required(),

    name: Joi.string().optional(),

    description: Joi.string().optional(),

});




module.exports = {
    addSubCategoryValidationSchema,
    updateSubCategoryValidationSchema
}