const Joi = require('joi');
const moment = require('moment');
const mongoose = require('mongoose');
const { assetAttachmentLength, assetAuditAttachmentLength } = require('../../constant/constant');

const objectIdValidation = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid', { value });
    }
    return value;
};

// ----- create asset -----
const addAssetValidationSchema = Joi.object({

    category: Joi.string().custom(objectIdValidation, 'Category ID validation').required().default(null),

    subCategory: Joi.string().custom(objectIdValidation, 'Sub Category ID validation').required().default(null),

    assetId: Joi.string().required(),

    name: Joi.string().required(),

    vendor: Joi.string().custom(objectIdValidation, 'Vendor Name validation').default(null),

    purchasedOn: Joi.date().allow(null),

    serialNumber: Joi.string().allow(""),

    expireDateWarranty: Joi.date().allow(null),

    expireWarrantyNotify: Joi.string(),

    price: Joi.number(),

    location: Joi.string().custom(objectIdValidation, 'Location validation').default(null),

    tag: Joi.string().custom(objectIdValidation, 'Tag validation').default(null),

    condition: Joi.string().custom(objectIdValidation, 'Condition validation').default(null),

    assignTo: Joi.string().custom(objectIdValidation, 'Assign To validation').default(null),

    // assignBy: Joi.string().custom(objectIdValidation, 'Assign By validation'),

    assignAt: Joi.date().when('assignTo', {
        is: Joi.exist().not(null),
        then: Joi.date().default(() => new Date()),
        otherwise: Joi.date().default(null)
    }),

    lastAuditDate: Joi.date().optional().default(function (context) {
        const purchaseOn = context.purchaseOn;
        const ninetyDaysAgo = moment().subtract(90, 'days');

        // If purchaseOn exists and is within the last 90 days, use it
        if (purchaseOn && moment(purchaseOn).isAfter(ninetyDaysAgo)) {
            return purchaseOn;
        }

        // If neither purchaseOn nor lastAuditDate exists, return the current date
        return moment().toDate();
    }),

    description: Joi.string().allow(""),

    createdBy: Joi.string().custom(objectIdValidation, 'Created By validation').default(null),

    createdOn: Joi.date().default(Date.now),

    isActive: Joi.boolean().default(true),

    isImport: Joi.boolean().default(false),

    isAssign: Joi.boolean().when('assignTo', {
        is: Joi.exist().not(null),
        then: Joi.boolean().valid(true).default(true),
        otherwise: Joi.boolean().valid(false).default(false)
    }),

    assignAssets: Joi.string().custom(objectIdValidation, 'Assign Assets validation').allow(null).optional(),

    isAssociate: Joi.boolean().when("assignAssets", {
        is: Joi.exist().not(null),
        then: Joi.boolean().valid(true).default(true),
        otherwise: Joi.boolean().valid(false).default(false)
    }),

    associate: Joi.array()
        .items(Joi.string().custom(objectIdValidation, 'ObjectId validation'))
        .unique()
        .default([]),

    status: Joi.number().when('assignTo', {
        is: Joi.exist().not(null),
        then: Joi.number().valid(3).default(3),
        otherwise: Joi.number().when('isAssociate', {
            is: true,
            then: Joi.number().valid(4).default(4),
            otherwise: Joi.number().valid(1).default(1)
        })
    }).valid(1, 2, 3, 4),

    files: Joi.array()
        .items(Joi.object())
        .max(assetAttachmentLength)
        .optional()
        .default([]),

});


// ----- update asset -----
const updateAssetValidationSchema = Joi.object({

    category: Joi.string().custom(objectIdValidation, 'Category ID validation').required(),

    subCategory: Joi.string().custom(objectIdValidation, 'Sub Category ID validation').required(),

    mainAssetId: Joi.string().custom(objectIdValidation, 'Main Asset ID validation').required(),

    assetId: Joi.string().optional(),

    name: Joi.string().optional(),

    vendor: Joi.string().custom(objectIdValidation, 'Vendor Name validation').allow(null).optional(),

    purchasedOn: Joi.date().allow(null).optional().
        custom((value, helpers) => {
            // Convert date from timestamp to ISO format
            return moment(value).toISOString();
        }),

    serialNumber: Joi.string().allow('').optional(),

    expireDateWarranty: Joi.date().allow(null).optional().custom((value, helpers) => {
        // Convert date from timestamp to ISO format
        return moment(value).toISOString();
    }),

    expireWarrantyNotify: Joi.string().allow('').optional(),

    price: Joi.number().allow(0).optional(),

    location: Joi.string().custom(objectIdValidation, 'Location validation').allow(null).optional(),

    tag: Joi.string().custom(objectIdValidation, 'Tag validation').allow(null).optional(),

    condition: Joi.string().custom(objectIdValidation, 'Condition validation').allow(null).optional(),

    assignTo: Joi.string().custom(objectIdValidation, 'Assign To validation').allow(null).optional(),

    // assignBy: Joi.string().custom(objectIdValidation, 'Assign By validation').allow(null),

    assignBy: Joi.string().when("assignTo", {
        is: Joi.exist().not(null),
        then: Joi.string().custom(objectIdValidation, 'Assign By validation'),
        otherwise: Joi.string().default(null)
    }),

    assignAt: Joi.date().when('assignTo', {
        is: Joi.exist().not(null),
        then: Joi.date().default(() => new Date()),
        otherwise: Joi.date().default(null)
    }),

    description: Joi.string().allow('').optional(),

    isActive: Joi.boolean().default(true),

    isAssign: Joi.boolean().when('assignTo', {
        is: Joi.exist().not(null),
        then: Joi.boolean().valid(true).default(true),
        otherwise: Joi.boolean().valid(false).default(false)
    }),

    assignAssets: Joi.string().custom(objectIdValidation, 'Assign Assets validation').allow(null).optional(),

    isAssociate: Joi.boolean().when("assignAssets", {
        is: Joi.exist().not(null),
        then: Joi.boolean().valid(true).default(true),
        otherwise: Joi.boolean().valid(false).default(false)
    }),

    associate: Joi.array()
        .items(Joi.string().custom(objectIdValidation, 'ObjectId validation'))
        .unique().optional(),

    status: Joi.number().when('assignTo', {
        is: Joi.exist().not(null),
        then: Joi.number().valid(3).default(3),
        otherwise: Joi.number().when('isAssociate', {
            is: true,
            then: Joi.number().valid(4).default(4),
            otherwise: Joi.number().valid(1).default(1)
        })
    }).valid(1, 2, 3, 4),

    files: Joi.array()
        .items(Joi.object())
        .max(assetAttachmentLength)
        .optional(),

    removeFiles: Joi.array()
        .items(Joi.string().custom(objectIdValidation, 'ObjectId validation'))
        .unique().optional(),
});


// ----- audit asset -----
const auditAssetValidationSchema = Joi.object({

    mainAssetId: Joi.string().custom(objectIdValidation, 'Main Asset ID validation').required(),

    condition: Joi.string().custom(objectIdValidation, 'Condition validation').required(),

    note: Joi.string().allow('').optional(),

    lastAuditDate: Joi.date().required()
        .custom((value, helpers) => {
            // Convert date from timestamp to ISO format
            return moment(value).toISOString();
        }),

    files: Joi.array()
        .items(Joi.object())
        .max(assetAuditAttachmentLength)
        .optional()
        .default([]),

})

module.exports = {
    addAssetValidationSchema,
    updateAssetValidationSchema,
    auditAssetValidationSchema
};
