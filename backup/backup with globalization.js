// ─────────────────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────────────────
const path = require("path");
const fs = require("fs")
const { ObjectId } = require("mongodb");
const { HTTP } = require("../constant/constant");
const client = require("../config/client");
const { addAssetValidationSchema, updateAssetValidationSchema } = require("../validation/assets/assetValidation");
const Asset = require("../models/assestsModel");
const Category = require("../models/categoryModel");

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "..", 'uploads');  // ? Directory for uploaded files

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

const { handleError, deleteFiles } = require("../utils/handleError");
const { checkAssociatedAssets, updateAssociatedAssets } = require("../handler/assetUpdater");

// ─────────────────────────────────────────────────────────────────────────────
// Main Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @description Handles asset attachment.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<Object>} JSON response with status, type, message, and data (if applicable).
 */

const attachment = async (req, res) => {
    try {

        // ? save file using for error then deleteation
        const latestFiles = [];

        // * Extract token from headers
        const token = req?.headers["authorization"]?.split(" ")[1];
        if (!token) {
            return await handleError(res, HTTP?.UNAUTHORIZED, "Unauthorized access", req?.files);
        }

        // * Get client data using the token
        const clientData = await client(token);
        if (!clientData) {
            return await handleError(res, HTTP?.UNAUTHORIZED, "Unauthorized access", req?.files);
        }

        // * Check if files are present in the request and add them to the request body
        if (req?.files?.length !== 0) {
            req.body.files = req?.files;
        }

        // * If it's an update operation by checking for mainAssetId in the request body
        const isUpdate = req?.body?.mainAssetId;

        // ? ========================================== Update ========================================== 
        if (isUpdate) {

            // ! Validate the update asset request using Joi
            const { error, value } = updateAssetValidationSchema.validate(req?.body);
            if (error) {
                return await handleError(res, HTTP?.BAD_REQ, error?.details[0]?.message, req?.files);
            }

            // ! Find the existing main asset
            const existingMainAsset = await Asset.findOne({ _id: value?.mainAssetId, isActive: true, isDeleted: false });
            if (!existingMainAsset) {
                return await handleError(res, HTTP?.NOT_FOUND, 'Asset not found', req?.files);
            }

            // ! Check for asset ID conflicts
            if (existingMainAsset?.assetId != value?.assetId) {
                const existingAsset = await Asset.findOne({ category: value?.category, assetId: value?.assetId, isActive: true, isDeleted: false });
                if (existingAsset) {
                    return await handleError(res, HTTP?.CONFLICT, 'AssetId already exists', req?.files);
                }
            }

            // * Extract associated assets that need to be added or removed
            const existingAssociates = existingMainAsset?.associate?.map(id => id?.toString());

            // ? ids added ===> with removed conflicts ids & not existing ids ----> uniqueness
            const idsToAdd = value?.associate?.filter((id, index, arr) => {
                return arr.indexOf(id) === index && !existingAssociates?.includes(id);
            });

            // ? ids removed
            const idsToRemove = existingMainAsset?.associate?.filter(id => !value?.associate?.includes(id?.toString()));



            // * if any add files 
            if (value?.files?.length > 0 && value?.files != undefined) {
                try {
                    // ! if already length is maximum then file not add
                    if (existingMainAsset?.files?.length == 3) {
                        return await handleError(res, HTTP?.BAD_REQ, "Not add more than 3 attchment", req?.files);
                    }

                    // ? else file update in DB
                    for (const file of value?.files) {
                        file._id = new ObjectId(); // for unique id after update use
                        file.ref = new ObjectId(existingMainAsset?._id); // for reffrence like which asstets attachment

                        // ? update in DB 
                        const updatedAssets = await Asset.findByIdAndUpdate(existingMainAsset?._id, {
                            $push: {
                                files: file
                            }
                        }, { new: true });

                        if (updatedAssets) {
                            latestFiles.push(file);
                            value.files = updatedAssets?.files;
                        }
                    }
                } catch (error) {
                    if (latestFiles?.length == 0) {
                        return await handleError(res, HTTP?.BAD_REQ, error.message, req?.files);
                    }
                    else {
                        return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
                    }
                }
            }

            // * if any remove files
            if (value?.removeFiles?.length != 0 && value?.removeFiles != undefined) {
                const removedFiles = []
                try {
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
                    try {
                        if (removedFiles && removedFiles.length > 0) {
                            // Find existing files in the current asset
                            const existingFilesInAsset = existingMainAsset.files.map(file => file?.filename);

                            // Filter out files that are already present
                            const newFilesToAdd = removedFiles.filter(file => !existingFilesInAsset.includes(file?.filename));

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
                                        // Create a file with placeholder content
                                        fs.writeFileSync(filePath, 'Placeholder content for the file.');
                                        console.log(`File created: ${filePath}`);
                                    } else {
                                        console.log(`File already exists: ${filePath}`);
                                    }
                                });
                            } else {
                                console.log('All files are already present in the asset.');
                            }
                        }
                    } catch (error) {
                        // Handle the error and rollback if needed
                        if (latestFiles?.length == 0) {
                            return await handleError(res, HTTP?.BAD_REQ, error.message, req?.files);
                        } else {
                            return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
                        }
                    }

                    if (latestFiles?.length == 0) {
                        return await handleError(res, HTTP?.BAD_REQ, error.message, req?.files);
                    }
                    else {
                        return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
                    }


                }
            }

            // * when associate include [] and assignTo both update
            if (value?.associate && value?.assignTo) {
                if (existingMainAsset?.status == 2 || existingMainAsset?.status == 4) {
                    return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
                }

                value.assignBy = clientData?._id?.toString();

                if (existingMainAsset?.assignTo == value?.assignTo) {
                    value.assignBy = existingMainAsset?.assignBy;
                    value.assignAt = existingMainAsset?.assignAt;
                }

                // ! Check if associated assets are available
                if (!(await checkAssociatedAssets(idsToAdd))) {
                    return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
                }

                // ! Update associated assets to remove
                if (idsToRemove && idsToRemove?.length > 0) {
                    const updateObjRemove = {
                        assignAssets: null,
                        isAssociate: false,
                        status: 1,
                        assignTo: null,
                        assignBy: null,
                        isAssign: false,
                        assignAt: null,
                    };

                    try {
                        await updateAssociatedAssets(idsToRemove, updateObjRemove);

                        // ! If associated assets have their own associated assets, update them as well
                        const updateObj = {
                            assignTo: null,
                            assignBy: null,
                            isAssign: false,
                            assignAt: null
                        };
                        idsToRemove?.forEach(async (id) => {
                            const idsToRemoveData = await Asset.findById(id);
                            if (idsToRemoveData?.associate && idsToRemoveData?.associate?.length > 0) {
                                await updateAssociatedAssets(idsToRemoveData?.associate, updateObj);
                            }
                        })

                    } catch (error) {
                        return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
                    }
                }

                // ? Update associated assets to add
                const updateObjAdd = {
                    assignAssets: existingMainAsset?._id,
                    isAssociate: true,
                    status: 4,
                    assignTo: value?.assignTo,
                    assignBy: value?.assignBy,
                    isAssign: value?.isAssign,
                    assignAt: value?.assignAt
                };

                // ? Update associate assets to add
                if (idsToAdd && idsToAdd?.length > 0) {
                    try {
                        await updateAssociatedAssets(idsToAdd, updateObjAdd);

                        // ! If associated assets have their own associated assets, update them as well
                        delete updateObjAdd?.assignAssets;
                        idsToAdd?.forEach(async (id) => {
                            const idsToAddData = await Asset.findById(id);
                            if (idsToAddData?.associate && idsToAddData?.associate?.length > 0) {
                                await updateAssociatedAssets(idsToAddData?.associate, updateObjAdd);
                            }
                        })

                    } catch (error) {
                        return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
                    }
                }

                // TODO ==> existingIds to same from new Ids bcz if new assignTo is not in exstingId
                const existingIds = existingMainAsset?.associate?.filter(id => value?.associate?.includes(id?.toString()));
                if (existingIds && existingIds?.length > 0) {
                    try {
                        await updateAssociatedAssets(existingIds, updateObjAdd);

                        // ! If associated assets have their own associated assets, update them as well
                        delete updateObjAdd?.assignAssets;
                        existingIds?.forEach(async (id) => {
                            const existingIdsData = await Asset.findById(id);
                            if (existingIdsData?.associate && existingIdsData?.associate?.length > 0) {
                                await updateAssociatedAssets(existingIdsData?.associate, updateObjAdd);
                            }
                        })

                    } catch (error) {
                        return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
                    }
                }
            }

            // ! when assignTo is null
            // * when assignTo is null but associate include [] available
            else if (value?.associate) {
                if (existingMainAsset?.status == 2 || existingMainAsset?.status == 4) {
                    return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
                }
                // ? Update associated assets to assignTo is null
                value.assignBy = null;
                value.isAssign = false;
                value.assignAt = null;
                const updateObjRemove = {
                    assignTo: value?.assignTo,
                    assignBy: value?.assignBy,
                    isAssign: value?.isAssign,
                    assignAt: value?.assignAt
                };

                // TODO ==> existingIds to same from new Ids bcz if new assignTo is not in exstingId
                const existingIds = existingMainAsset?.associate?.filter(id => value?.associate?.includes(id?.toString()));
                if (existingIds && existingIds?.length > 0) {
                    try {
                        await updateAssociatedAssets(existingIds, updateObjRemove);

                        // ! If associated assets have their own associated assets, update them as well
                        existingIds?.forEach(async (id) => {
                            const existingIdsData = await Asset.findById(id);
                            if (existingIdsData?.associate && existingIdsData?.associate?.length > 0) {
                                await updateAssociatedAssets(existingIdsData?.associate, updateObjRemove);
                            }
                        })

                    } catch (error) {
                        return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
                    }
                }

                // ! Check if associated assets are available
                if (!(await checkAssociatedAssets(idsToAdd))) {
                    return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
                }

                // ! Update associated assets to remove
                if (idsToRemove && idsToRemove?.length > 0) {
                    const updateObjRemoveAdditional = {
                        ...updateObjRemove,
                        assignAssets: null,
                        isAssociate: false,
                        status: 1,

                    };
                    try {
                        await updateAssociatedAssets(idsToRemove, updateObjRemoveAdditional);

                        // ! If associated assets have their own associated assets, update them as well
                        idsToRemove?.forEach(async (id) => {
                            const idsToRemoveData = await Asset.findById(id);
                            if (idsToRemoveData?.associate && idsToRemoveData?.associate?.length > 0) {
                                await updateAssociatedAssets(idsToRemoveData?.associate, updateObjRemove);
                            }
                        })

                    } catch (error) {
                        return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
                    }
                }

                // ? Update associated assets to be added
                if (idsToAdd && idsToAdd?.length > 0) {
                    const updateObjAdd = {
                        ...updateObjRemove,
                        assignAssets: existingMainAsset?._id,
                        isAssociate: true,
                        status: 4,
                    };
                    try {
                        await updateAssociatedAssets(idsToAdd, updateObjAdd);

                        // ! If associated assets have their own associated assets, update them as well
                        idsToAdd?.forEach(async (id) => {
                            const idsToAddData = await Asset.findById(id);
                            if (idsToAddData?.associate && idsToAddData?.associate?.length > 0) {
                                await updateAssociatedAssets(idsToAddData?.associate, updateObjRemove);
                            }
                        })

                    } catch (error) {
                        return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
                    }
                }
            }

            // ? Merge existingMainAsset with new data
            const mergedData = { ...existingMainAsset?.toObject(), ...value };

            // ? Update the main asset
            try {
                await Asset.findByIdAndUpdate(value?.mainAssetId, mergedData, { new: true });
            } catch (error) {
                return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
            }

            return res.status(HTTP?.SUCCESS).json({ status: HTTP?.SUCCESS, type: "updateAssets", message: 'Asset update successfully' });
        }

        // ? ========================================== Insert ==========================================
        else {

            // ? Set createdBy based on client
            req.body.createdBy = clientData?._id?.toString();

            // ! Validate data using Joi schema
            const { error, value } = addAssetValidationSchema.validate(req?.body);
            if (error) {
                return await handleError(res, HTTP?.BAD_REQ, error?.details[0]?.message, req?.files);
            }

            // ! Check if asset with the same categoryId and assetId already exists
            const existingAsset = await Asset.findOne({ category: value?.category, assetId: value?.assetId, isActive: true, isDeleted: false });
            if (existingAsset) {
                return await handleError(res, HTTP?.CONFLICT, "AssetId already exists", req?.files);
            }

            // ! Fetch category data
            const categoryData = await Category.findOne({ _id: value?.category, isActive: true, isDeleted: false });
            if (!categoryData) {
                return await handleError(res, HTTP?.NOT_FOUND, "Category not found", req?.files);
            }

            // ? if associate other assets 
            if (value?.associate && value?.associate?.length > 0) {

                // TODO ==> Use Set to ensure uniqueness
                const uniqueAssociateIds = new Set(value?.associate);
                value.associate = [...uniqueAssociateIds]; // ? Convert Set back to array

                // ! Check if associated assets are available
                if (!(await checkAssociatedAssets(value?.associate))) {
                    return await handleError(res, HTTP?.BAD_REQ, 'Associated asset not available', req?.files);
                }
            }

            // ? assignBy base on assignTo
            value.assignBy = value.assignTo ? clientData?._id?.toString() : null;

            // ? Construct asset object to save
            const asset = {
                category: value?.category,
                assetId: value?.assetId,
                name: value?.name,
                vendor: value?.vendor,
                purchasedOn: value?.purchasedOn,
                serialNumber: value?.serialNumber,
                expireDateWarranty: value?.expireDateWarranty,
                expireWarrantyNotify: value?.expireWarrantyNotify,
                price: value?.price,
                location: value?.location,
                tag: value?.tag,
                condition: value?.condition,
                assignTo: value?.assignTo,
                assignBy: value?.assignBy,
                assignAt: value?.assignAt,
                description: value?.description,
                assignAssets: value?.assignAssets,
                isActive: value?.isActive,
                isAssign: value?.isAssign,
                createdBy: value?.createdBy,
                createdOn: value?.createdOn,
                associate: value?.associate,
                status: value?.status
            };

            // * Save the asset with attachments
            try {
                // ! If the number of files exceeds the limit, return an error
                if (value?.files?.length > 3) {
                    return await handleError(res, HTTP?.BAD_REQ, "Cannot add more than 3 attachments", req?.files);
                }

                const savedAsset = await new Asset(asset).save();

                if (!savedAsset) {
                    return await handleError(res, HTTP?.BAD_REQ, "Failed to add asset", req?.files);
                }

                // ? If there are files to be added, update the asset with these files
                if (value?.files && value?.files?.length > 0) {
                    for (const file of value?.files) {
                        file._id = new ObjectId(); // ? Assign a unique ID
                        file.ref = new ObjectId(savedAsset?._id); // ? Reference the saved asset

                        // ? Update the asset with the new file
                        await Asset.findByIdAndUpdate(
                            savedAsset?._id,
                            { $push: { files: file } },
                            { new: true }
                        );

                        latestFiles.push(file)
                    }
                }

                // ? Update associated assets
                if (value?.associate && value?.associate?.length > 0) {
                    const updateObj = {
                        assignAssets: savedAsset?._id,
                        isAssociate: true,
                        status: 4,
                        assignTo: value?.assignTo,
                        assignBy: value?.assignBy,
                        isAssign: value?.isAssign,
                        assignAt: value?.assignAt
                    };

                    await updateAssociatedAssets(value?.associate, updateObj);

                    // ! If associated assets have their own associated assets, update them as well
                    delete updateObj?.assignAssets;
                    for (const id of value?.associate) {
                        const existingIdsData = await Asset.findById(id);
                        if (existingIdsData?.associate && existingIdsData?.associate?.length > 0) {
                            await updateAssociatedAssets(existingIdsData?.associate, updateObj);
                        }
                    }
                }

            } catch (error) {
                if (latestFiles?.length == 0) {
                    return await handleError(res, HTTP?.BAD_REQ, error.message, req?.files);
                }
                else {
                    return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, savedAsset?._id);
                }
            }

            // ! Handle auto-increment logic if required
            if (categoryData?.assetIdType == 2) {
                categoryData.autoInc.number = `${parseInt(categoryData?.autoInc?.number) + 1}`.padStart(categoryData?.autoInc?.number?.length, '0');
                try {
                    await categoryData.save();
                } catch (error) {
                    if (latestFiles?.length == 0) {
                        return await handleError(res, HTTP?.BAD_REQ, error.message, req?.files);
                    }
                    else {
                        return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, savedAsset?._id);
                    }
                }
            }

            return res.status(HTTP?.SUCCESS).json({ status: HTTP?.SUCCESS, type: "addAssets", message: "Assets Add Successfully" });
        }

    } catch (error) {
        return await handleError(res, HTTP?.BAD_REQ, error.message, req?.files);
    }
}

module.exports = {
    attachment
}
