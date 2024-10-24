const Joi = require('joi');
const mongoose = require('mongoose');

const objectIdValidation = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid', { value });
    }
    return value;
};

const addExpireWarrantyMailValidation = Joi.object({
    location: Joi.string().custom(objectIdValidation, 'ObjectId validation').allow(null),
    userList: Joi.array().unique().items(Joi.string().custom(objectIdValidation, 'ObjectId validation')).optional(),
    createdBy: Joi.string().custom(objectIdValidation, 'User ID validation').default(null),
    createdOn: Joi.date().default(Date.now),
}).options({ abortEarly: false });

const updateExpireWarrantyMailValidation = Joi.object({
    emailAlertId: Joi.string().custom(objectIdValidation, 'ObjectId validation').required(),
    location: Joi.string().custom(objectIdValidation, 'ObjectId validation').allow(null),
    userList: Joi.array().unique().items(Joi.string().custom(objectIdValidation, 'ObjectId validation')).optional(),
}).options({ abortEarly: false });

module.exports = { addExpireWarrantyMailValidation, updateExpireWarrantyMailValidation };

