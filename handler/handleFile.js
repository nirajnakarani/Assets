// ─────────────────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────────────────
const { ObjectId } = require('mongodb');
const Asset = require("../models/assestsModel");
const { handleError, deleteFiles } = require('../utils/handleError');
const fs = require("fs");
const path = require("path");
// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const { HTTP, uploadDir } = require('../constant/constant');


const handleFileUpdate = async (req, res, value, existingMainAsset, latestFiles) => {
    try {
        // ? else file update in DB
        const filesWithIds = value?.files.map(file => {
            file._id = new ObjectId(); // Assign a unique ID
            file.ref = new ObjectId(existingMainAsset?._id); // Reference the existing main asset
            return file;
        });

        // Perform a single update operation to push all files
        const updatedAssets = await Asset.findByIdAndUpdate(
            existingMainAsset?._id,
            {
                $push: {
                    files: { $each: filesWithIds } // Push all files at once
                }
            },
            { new: true }
        );

        if (updatedAssets) {
            latestFiles.push(...filesWithIds); // Add all files to latestFiles
            value.files = updatedAssets?.files; // Update value.files with the updated list
        }
    } catch (error) {
        console.log("errors:::::::>>>>", error);
        return await handleErrorBasedOnFileCount(req, res, error, latestFiles, existingMainAsset?._id)
    }

}

const handleFileRemove = async (req, res, value, existingMainAsset, latestFiles) => {
    try {
        let removedFiles = [];

        // ! remove files match from existing files
        const removeData = existingMainAsset?.files?.filter(file => value?.removeFiles?.includes(file?._id?.toString()));

        if (removeData?.length > 0) {
            removedFiles = [...removeData]

            // ! Remove files from MongoDB
            await Asset.findByIdAndUpdate(existingMainAsset?._id, {
                $pull: {
                    files: { _id: { $in: removeData?.map(file => file?._id) } }
                }
            }, { new: true });

            // ! Remove files from uploads folder
            deleteFiles(removeData, uploadDir);

            // ? after deleted file update in db
            existingMainAsset.files = existingMainAsset?.files?.filter(file => !value?.removeFiles?.includes(file?._id?.toString()));
        }

    } catch (error) {
        await rollbackFileChange(req, res, error, removedFiles, existingMainAsset, latestFiles)
    }
}

const rollbackFileChange = async (req, res, error, removedFiles, existingMainAsset, latestFiles) => {
    try {
        if (removedFiles && removedFiles?.length > 0) {

            // Find existing files in the current asset
            const existingFilesInAsset = existingMainAsset?.files?.map(file => file?.filename);

            // Filter out files that are already present
            const newFilesToAdd = removedFiles?.filter(file => !existingFilesInAsset?.includes(file?.filename));

            if (newFilesToAdd?.length > 0) {
                // Update MongoDB with only new files
                await Asset.findByIdAndUpdate(existingMainAsset?._id, {
                    $push: {
                        files: { $each: newFilesToAdd }
                    }
                }, { new: true });

                newFilesToAdd.forEach(file => {
                    const filePath = path.join(uploadDir, file?.filename);

                    // Check if the file already exists to avoid overwriting
                    if (!fs.existsSync(filePath)) {
                        try {

                            // Copy the file from its current path to the target path
                            fs.copyFileSync(file?.path, filePath);
                            console.log(`File copied: ${filePath}`);
                        } catch (error) {
                            console.error(`Error copying file ${filePath}:`, error);
                        }
                    } else {
                        console.log(`File already exists: ${filePath}`);
                    }
                });
            } else {
                console.log('All files are already present in the asset.');
            }
        }
    } catch (rolbakcError) {
        return await handleErrorBasedOnFileCount(req, res, rolbakcError, latestFiles, existingMainAsset?._id)
    }

    return await handleErrorBasedOnFileCount(req, res, error, latestFiles, existingMainAsset?._id)

}

const handleErrorBasedOnFileCount = async (req, res, error, latestFiles, assetId) => {
    // Handle the error and rollback if needed
    if (latestFiles?.length == 0) {
        return await handleError(res, HTTP?.BAD_REQ, error.message, req?.files);
    } else {
        return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, assetId);
    }
}

module.exports = {
    handleFileUpdate,
    handleFileRemove
}