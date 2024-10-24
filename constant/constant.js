const path = require("path")
module.exports = {
    HTTP: {
        SUCCESS: 200,
        BAD_REQ: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        INTERNAL_SERVER: 500
    },
    assetAttachmentLength: 3,
    assetAuditAttachmentLength: 3,
    assetStatus: {
        available: 1,
        unavailable: 2,
        assign: 3,
        associate: 4
    },
    uploadDir: path.join(__dirname, "..", "uploads"),
    importDir: path.join(__dirname, "..", "import"),
    redisConnection: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    },
    activityConstant: {
        activity: {
            create: "created",
            update: "modified"
        },
        vendor: "vendorData",
        tag: "tagData",
        condition: "conditionData",
        location: "locationData",
        category: "categoryData",
        subCategory: "subCategoryData",
        asset: "assetData"
    },
    mailOption: {
        operation: {
            add: "add",
            update: "update",
            delete: "delete",
            assign: "assign",
            expire: "expire",
            audit: "audit"
        }
    }
}