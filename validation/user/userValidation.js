const Joi = require('joi');

// ----- user register -----
const registerValidation = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    user_img: Joi.string().uri().optional(), // Assuming user_img is a URL
    role: Joi.number().valid(1, 2, 3).default(3)
});

// ----- user login -----
const loginValidation = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});


module.exports = {
    registerValidation,
    loginValidation
};