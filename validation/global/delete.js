const Joi = require('joi');
const mongoose = require('mongoose');

const objectIdValidation = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid', { value });
    }
    return value;
};

const deleteValidationSchema = Joi.object({

    categoryId: Joi.string().custom(objectIdValidation, 'Category ID validation'),
    subCategoryId: Joi.string().custom(objectIdValidation, 'Sub Category ID validation'),
    assetId: Joi.string().custom(objectIdValidation, 'Asset ID validation'),
    vendorId: Joi.string().custom(objectIdValidation, 'Vendor ID validation'),
    tagId: Joi.string().custom(objectIdValidation, 'Tag ID validation'),
    locationId: Joi.string().custom(objectIdValidation, 'Location ID validation'),
    conditionId: Joi.string().custom(objectIdValidation, 'Condition ID validation'),
    UACId: Joi.string().custom(objectIdValidation, 'UAC ID validation'),
    emailAlertId: Joi.string().custom(objectIdValidation, 'Email Alert ID validation'),

    isDeleted: Joi.boolean().required().default(true),

    deletedBy: Joi.string().custom(objectIdValidation, "User ID validation").required(),

    // deletedBy: Joi.string().custom((value, helpers) => {
    //     if (!mongoose.Types.ObjectId.isValid(value)) {
    //         return helpers.error('any.invalid');
    //     }
    //     return value;
    // }).required(),

    deletedOn: Joi.date().required().default(Date.now)

}).xor('categoryId', "subCategoryId", "assetId", 'vendorId', 'tagId', 'locationId', 'conditionId', "UACId", "emailAlertId");

module.exports = deleteValidationSchema;
