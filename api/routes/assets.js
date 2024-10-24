const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path")
const { attachment, auditAsset } = require("../controllers/assets");
const authUser = require("../../auth/authUser");
const { assetAttachmentLength, assetAuditAttachmentLength } = require("../../constant/constant")
const uploadDir = path.join(__dirname, "../..", "uploads")
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}_${file.originalname}`;
        cb(null, uniqueName);
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png/;
        const mimeType = fileTypes.test(file.mimetype);
        const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());

        if (mimeType && extName) {
            return cb(null, true);
        }
        cb('Error: Images only!');
    }
});

// ----- POST  Assets With Attachment ----- 
router.post("/attachment", upload.array("attachment", assetAttachmentLength), authUser, attachment)

router.post("/auditAsset", upload.array("attachment", assetAuditAttachmentLength), authUser, auditAsset)

router.use("/excel", require("./excel"));

module.exports = router;