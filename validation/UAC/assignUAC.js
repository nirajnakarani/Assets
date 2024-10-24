const Joi = require('joi');
const mongoose = require('mongoose');

const objectIdValidation = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid', { value });
    }
    return value;
};

const uacAssignSchema = Joi.object({
    UACId: Joi.string().custom(objectIdValidation, 'ObjectId validation').required(),
    newAssign: Joi.array().items(Joi.string().custom(objectIdValidation, 'ObjectId validation')).optional(),
    removeAssign: Joi.array().items(Joi.string().custom(objectIdValidation, 'ObjectId validation')).optional()
}).options({ abortEarly: false });

module.exports = uacAssignSchema;
