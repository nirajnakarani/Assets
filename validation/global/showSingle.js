const Joi = require('joi');
const mongoose = require('mongoose');

const objectIdValidation = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid', { value });
    }
    return value;
};

// Define your Joi schema
const showSingleValidationSchema = Joi.object({

    categoryId: Joi.string().custom(objectIdValidation, 'Category ID validation'),
    subCategoryId: Joi.string().custom(objectIdValidation, 'Sub Category ID validation'),
    assetId: Joi.string().custom(objectIdValidation, 'Asset ID validation'),
    vendorId: Joi.string().custom(objectIdValidation, 'Vendor ID validation'),
    tagId: Joi.string().custom(objectIdValidation, 'Tag ID validation'),
    locationId: Joi.string().custom(objectIdValidation, 'Location ID validation'),
    conditionId: Joi.string().custom(objectIdValidation, 'Condition ID validation'),
    userId: Joi.string().custom(objectIdValidation, 'User ID validation'),
    UACId: Joi.string().custom(objectIdValidation, 'User ID validation'),

}).xor('categoryId', "subCategoryId", "assetId", 'vendorId', 'tagId', 'locationId', 'conditionId', "userId", "UACId");

module.exports = showSingleValidationSchema;
