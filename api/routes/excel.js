const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path")
const fs = require("fs");
const { importAsset } = require("../controllers/excel");
const authUser = require("../../auth/authUser");
const { uploadDir } = require("../../constant/constant");

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
        // Define allowed MIME types for Excel files
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel' // .xls
        ];

        // Check if the MIME type of the file is allowed
        const isMimeTypeValid = allowedMimeTypes.includes(file.mimetype);
        const isExtNameValid = /\.(xlsx|xls)$/i.test(path.extname(file.originalname).toLowerCase());

        if (isMimeTypeValid && isExtNameValid) {
            return cb(null, true);
        }
        cb(new Error('Error: Excel files only!'));
    }
});


// ----- GET  get demo for import assets ----- 
// router.get("/getSampleAsset", downloadSample);

// router.get("/getErrorAsset", downloadError);

router.post("/importAsset", upload.single("asset"), authUser, importAsset);

module.exports = router;