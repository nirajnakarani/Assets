// ─────────────────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────────────────
const path = require("path");
const Asset = require("../models/assestsModel");
const fs = require("fs");
// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const { uploadDir } = require("../constant/constant");

/**
 * @description Handles errors by deleting uploaded files (if any) and sending an error response.
 * 
 * This function performs the following actions:
 * 1. Rolls back database changes by removing files from a specified asset if there are any `files` provided.
 * 2. Deletes the uploaded files from the filesystem if any are provided.
 * 3. Sends an error response with the specified HTTP status code and message.
 * 
 * @async
 * 
 * @param {Object} res - Express response object used to send the response.
 * @param {number} status - HTTP status code to be sent in the response.
 * @param {string} message - Error message to be included in the response.
 * @param {Array} [files] - Array of files to be deleted from the filesystem. Can be `null` or `undefined` if no files need to be deleted.
 * @param {string} id - The ID of the asset from which files should be removed.
 * 
 * @returns {Promise<Object>} JSON response with the following properties:
 *   - `status`: The HTTP status code.
 *   - `type`: Always "error" indicating an error response.
 *   - `message`: The error message provided.
 */

const handleError = async (res, status, message, files, id) => {
    try {
        if (files && files?.length > 0 && id) {
            const fileIds = files?.map(file => file?._id); // Extract all file IDs

            // Perform a single update operation to pull all files at once
            await Asset.findByIdAndUpdate(
                id,
                {
                    $pull: {
                        files: { _id: { $in: fileIds } } // Use $in to remove multiple files
                    }
                },
                { new: true }
            );

            console.log("Files removed from asset:", fileIds);
        }
    } catch (dbError) {
        console.error('Error while rolling back database changes:', dbError);
    }
    if (files?.length > 0) deleteFiles(files, uploadDir);
    if (res.headersSent) {
        console.log('Headers already sent, skipping handleError');
        // return res.status(status).json({ status, type: "error", message });
        return;
    }
    return res.status(status).json({ status, type: "error", message });

};


/**
 * @description Handles deleting uploaded files (if any)
 * @param {Array} files - Array of uploaded files.
 * @param {String} directory - Path to delete file directory.
*/
const deleteFiles = (files, directory) => {
    if (files && files?.length > 0) {
        console.log("delete files");
        files?.forEach(file => {
            const filePath = path.join(directory, file?.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    }
}


module.exports = { handleError, deleteFiles };