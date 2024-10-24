// ─────────────────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────────────────
const { ObjectId } = require("mongodb");
const Asset = require("../../models/assestsModel");
const User = require("../../models/userModel");
const Category = require("../../models/categoryModel");
const SubCategory = require("../../models/subCategoryModel");
const moment = require("moment")

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────
const { addAssetValidationSchema, updateAssetValidationSchema, auditAssetValidationSchema } = require("../../validation/assets/assetValidation");
const { handleError } = require("../../utils/handleError");
const { checkAssociatedAssets } = require("../../handler/assetUpdater");
const { updateAssociatedAssets } = require("../../handler/assetUpdater");
const { handleFileUpdate, handleFileRemove } = require("../../handler/handleFile");
const { findUAC } = require("../../config/UAC");
const { activityLog } = require("../../handler/activityLog");
// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const { HTTP, assetAttachmentLength, assetStatus, assetAuditAttachmentLength, activityConstant, mailOption } = require("../../constant/constant");
const { mailQueue } = require("../../redis/queue");
const statusMapping = {
    [assetStatus?.available]: { status: "Available", status_class: "status-available" },
    [assetStatus?.unavailable]: { status: "Unavailable", status_class: "status-unavailable" },
    [assetStatus?.assign]: { status: "Assigned", status_class: "status-assigned" },
    [assetStatus?.associate]: { status: "Associate", status_class: "status-associate" }
};

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

        // * Get client data using the token
        const clientData = req?.clientData;
        if (!clientData) {
            return await handleError(res, HTTP?.UNAUTHORIZED, "Unauthorized access", req?.files);
        }

        // * Check if files are present in the request and add them to the request body
        if (req?.files?.length !== 0) {
            req.body.files = req?.files;
        }
        else {
            return await handleError(res, HTTP?.BAD_REQ, "Please insert attachment", []);
        }

        // * If it's an update operation by checking for mainAssetId in the request body
        const isUpdate = req?.body?.mainAssetId;

        // ? =========================================== Update =========================================== 
        if (isUpdate) {
            const isAccess = await findUAC(clientData?._id, "assets", "assets", "edit");
            if (!isAccess) {
                return await handleError(res, HTTP?.UNAUTHORIZED, "Unauthorized access", req?.files);
            }
            else {
                return await handleUpdate(req, res, clientData, latestFiles);
            }
        }

        // ? =========================================== Insert ===========================================
        else {
            const isAccess = await findUAC(clientData?._id, "assets", "assets", "add");
            if (!isAccess) {
                return await handleError(res, HTTP?.UNAUTHORIZED, "Unauthorized access", req?.files);
            }
            else {
                return await hanldeInsert(req, res, clientData, latestFiles);
            }
        }

    } catch (error) {
        return await handleError(res, HTTP?.INTERNAL_SERVER, error.message, req?.files);
    }
};

const handleUpdate = async (req, res, clientData, latestFiles) => {

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

    const isSubCategoryChanged = existingMainAsset?.subCategory != value?.subCategory;
    const isAssetIdChanged = existingMainAsset?.assetId != value?.assetId;

    if (isSubCategoryChanged || isAssetIdChanged) {
        // ! Check for sub category if changed
        if (isSubCategoryChanged) {
            const subCategoryData = await SubCategory.findOne({ _id: value?.subCategory, category: value?.category, isActive: true, isDeleted: false });
            if (!subCategoryData) {
                return await handleError(res, HTTP?.NOT_FOUND, 'Sub Category not found', req?.files);
            }
        }

        // ! Check for asset ID conflicts if either changed
        const existingAsset = await Asset.findOne({ category: value?.category, subCategory: value?.subCategory, assetId: value?.assetId, isActive: true, isDeleted: false });
        if (existingAsset) {
            return await handleError(res, HTTP?.CONFLICT, 'AssetId already exists', req?.files);
        }
    }

    // ! Check for asset is parallelly associate
    if (value?.associate?.includes(value?.mainAssetId)) {
        return await handleError(res, HTTP?.BAD_REQ, 'Asset not associate parallelly', req?.files);
    }

    // ? ids added ===> with removed conflicts ids & not existing ids ----> uniqueness
    const idsToAdd = getUniqueIdsToAdd(existingMainAsset?.associate, value?.associate);

    // ? ids removed
    const idsToRemove = getIdsToRemove(existingMainAsset?.associate, value?.associate);


    if (existingMainAsset?.status == assetStatus?.associate) {
        Object.assign(value, {
            assignTo: existingMainAsset?.assignTo,
            assignBy: existingMainAsset?.assignBy,
            assignAt: existingMainAsset?.assignAt,
            isAssign: existingMainAsset?.isAssign,
            isAssociate: existingMainAsset?.isAssociate,
            assignAssets: existingMainAsset?.assignAssets,
            associate: existingMainAsset?.associate,
            status: existingMainAsset?.status
        });
    }
    else {
        // * if any add files 
        if (value?.files?.length > 0 && value?.files != undefined) {

            // ! if already length is maximum then file not add
            if (existingMainAsset?.files?.length + value?.files?.length > assetAttachmentLength) {
                return await handleError(res, HTTP?.BAD_REQ, "Not add more than " + assetAttachmentLength + " attchment", req?.files);
            }
            else {
                await handleFileUpdate(req, res, value, existingMainAsset, latestFiles)
            }
        }

        // * if any remove files
        if (value?.removeFiles?.length != 0 && value?.removeFiles != undefined) {
            await handleFileRemove(req, res, value, existingMainAsset, latestFiles)
        }

        // * when associate include [] and assignTo both update
        if (value?.associate && value?.assignTo) {
            await handleAssociateUpdate(req, res, value, existingMainAsset, clientData, idsToAdd, idsToRemove, latestFiles);
        }

        // * when assignTo update
        else if (value?.assignTo) {
            await handleAssociateUpdate(req, res, value, existingMainAsset, clientData, idsToAdd, idsToRemove, latestFiles);
        }

        // ! when assignTo is null
        // * when assignTo is null but associate include [] available
        else if (value?.associate) {
            await handleAssociateUpdateWithNullAssignTo(req, res, value, existingMainAsset, idsToAdd, idsToRemove, latestFiles);
        }
    }

    // ? Merge existingMainAsset with new data
    const mergedData = { ...existingMainAsset?.toObject(), ...value };

    // ? Update the main asset
    try {
        const updateAssets = await Asset.findByIdAndUpdate(value?.mainAssetId, mergedData, { new: true });

        const activityData = {
            activityId: existingMainAsset?._id,
            activityModel: activityConstant?.asset,
            actionBy: clientData?._id,
            ipAddress: "0.0.0",
            activity: activityConstant?.activity?.update,
            logs: [{
                old: {
                    ...existingMainAsset
                },
                new: {
                    ...updateAssets
                }
            }]
        }
        await activityLog(activityData)



        let asset = await Asset.findById(value?.mainAssetId)
            .populate("createdBy", "name")
            .populate("category", "name icon color")
            .populate("subCategory", "name")
            .populate("condition", "name")
            .populate("location", "name")
            .populate("tag", "name color")
            .populate("vendor", "name")
            .populate("assignTo", "name")
            .populate("assignBy", "name")
            .populate("assignAssets", "assetId")
            .populate("associate", "assetId");
        asset = asset?.toObject();

        // if (asset?.category) {
        //     asset.category.icon = 'fas fa-' + asset?.category?.icon;
        // }
        if (asset?.expireDateWarranty) {
            asset.expireDateWarranty = moment(asset?.expireDateWarranty).format('MMM DD, YYYY, hh:mm A');
        }
        if (asset?.purchasedOn) {
            asset.purchasedOn = moment(asset?.purchasedOn).format('MMM DD, YYYY, hh:mm A');
        }
        if (asset?.assignAt) {
            asset.assignAt = moment(asset?.assignAt).format('MMM DD, YYYY, hh:mm A');
        }
        if (asset?.lastAuditDate) {
            asset.lastAuditDate = moment(asset?.lastAuditDate).format('MMM DD, YYYY, hh:mm A');
        }
        if (asset?.createdOn) {
            asset.actionAt = moment(asset?.createdOn).format('MMM DD, YYYY, hh:mm A');
        }
        if (asset?.createdBy) {
            asset.actionBy = asset?.createdBy;
        }
        asset.isImport = asset?.isImport ? "Yes" : "No";
        const { status, status_class } = statusMapping[asset?.status] || { status: "-", status_class: "-" };

        asset.status = status;
        asset.status_class = status_class;
        asset.associate = asset?.associate?.map(asset => asset?.assetId).join(",");

        const systemAdmins = await User.find({ role: 1, isActive: true }).select('name email').exec();

        // Add mail tasks for each admin concurrently
        await Promise.all(
            systemAdmins.map(async (admin) => {
                const mailData = {
                    operation: mailOption?.operation?.update,
                    asset: asset,
                    user: {
                        name: admin?.name,
                        email: admin?.email
                    },
                };
                console.log("admin::::::::::::>>>>>>>>>>");
                await mailQueue.add("mailTask", mailData, { delay: 10000 });
            })
        );

        // Check if there is an assigned user and add a mail task if applicable
        if (value?.assignTo && value?.assignTo != existingMainAsset?.assignTo) {
            const user = await User.findById(value?.assignTo)
            if (user) {
                const mailData = {
                    operation: mailOption?.operation?.assign,
                    asset: asset,
                    user: {
                        name: user?.name,
                        email: user?.email
                    },
                };
                console.log("assign:::::::::::::>>>>>>>");

                await mailQueue.add("mailTask", mailData, { delay: 10000 });
            }
        }
        return res.status(HTTP?.SUCCESS).json({ status: HTTP?.SUCCESS, type: "updateAssets", message: 'Asset update successfully' });
    } catch (error) {
        return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
    }


};

const hanldeInsert = async (req, res, clientData, latestFiles) => {

    // ? Set createdBy based on client
    req.body.createdBy = clientData?._id?.toString();

    // ! Validate data using Joi schema
    const { error, value } = addAssetValidationSchema.validate(req?.body);
    if (error) {
        return await handleError(res, HTTP?.BAD_REQ, error?.details[0]?.message, req?.files);
    }

    // ! Check if asset with the same categoryId and assetId already exists
    const existingAsset = await Asset.findOne({ category: value?.category, subCategory: value?.subCategory, assetId: value?.assetId, isActive: true, isDeleted: false });
    if (existingAsset) {
        return await handleError(res, HTTP?.CONFLICT, "AssetId already exists", req?.files);
    }

    // ! Fetch category data
    const categoryData = await Category.findOne({ _id: value?.category, isActive: true, isDeleted: false });
    if (!categoryData) {
        return await handleError(res, HTTP?.NOT_FOUND, "Category not found", req?.files);
    }

    const subCategoryData = await SubCategory.findOne({ _id: value?.subCategory, category: value?.category, isActive: true, isDeleted: false });
    if (!subCategoryData) {
        return await handleError(res, HTTP?.NOT_FOUND, "Sub Category not found", req?.files);
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
    value.assignBy = value?.assignTo ? clientData?._id?.toString() : null;

    // ? Construct asset object to save
    const asset = {
        category: value?.category,
        subCategory: value?.subCategory,
        assetId: value?.assetId,
        name: value?.name,
        vendor: value?.vendor,
        purchasedOn: value?.purchasedOn || null,
        serialNumber: value?.serialNumber || "",
        expireDateWarranty: value?.expireDateWarranty || null,
        expireWarrantyNotify: value?.expireWarrantyNotify || "",
        price: value?.price || 0,
        location: value?.location,
        tag: value?.tag,
        condition: value?.condition,
        assignTo: value?.assignTo,
        assignBy: value?.assignBy,
        assignAt: value?.assignAt,
        description: value?.description || "",
        assignAssets: value?.assignAssets || null,
        isActive: value?.isActive,
        isAssign: value?.isAssign,
        createdBy: value?.createdBy,
        createdOn: value?.createdOn,
        associate: value?.associate,
        status: value?.status,
        lastAuditDate: value?.lastAuditDate
    };

    // * Save the asset with attachments
    try {
        // ! If the number of files exceeds the limit, return an error
        if (value?.files?.length > assetAttachmentLength) {
            return await handleError(res, HTTP?.BAD_REQ, "Cannot add more than " + assetAttachmentLength + " attachments", req?.files);
        }


        let savedAsset = await Asset.create(asset);
        if (!savedAsset) {
            return await handleError(res, HTTP?.BAD_REQ, "Failed to add asset", req?.files);
        }

        // ? If there are files to be added, update the asset with these files
        if (value?.files && value?.files?.length > 0) {
            const filesWithIds = value.files.map((file) => {
                file._id = new ObjectId(); // Assign a unique ID
                file.ref = new ObjectId(savedAsset?._id); // Reference the saved asset
                return file;
            });

            // Perform a single update operation to push all files
            savedAsset = await Asset.findByIdAndUpdate(
                savedAsset?._id,
                { $push: { files: { $each: filesWithIds } } }, // Use $each to push all files at once
                { new: true }
            );

            latestFiles.push(...filesWithIds); // Add all files to latestFiles
        }

        // ? Update associated assets
        if (value?.associate && value?.associate?.length > 0) {
            const updateObj = {
                assignAssets: savedAsset?._id,
                isAssociate: true,
                status: assetStatus?.associate,
                assignTo: value?.assignTo,
                assignBy: value?.assignBy,
                isAssign: value?.isAssign,
                assignAt: value?.assignAt,
                lastAuditDate: value?.lastAuditDate
            };

            await updateAssociatedAssets(value?.associate, updateObj);

            // ! If associated assets have their own associated assets, update them as well
            delete updateObj?.assignAssets;

            // for (const id of value?.associate) {
            //     const existingIdsData = await Asset.findById(id);
            //     if (existingIdsData?.associate && existingIdsData?.associate?.length > 0) {
            //         await updateAssociatedAssets(existingIdsData?.associate, updateObj);
            //     }
            // }



            const existingIdsDataArray = await Asset.find({ _id: { $in: value?.associate } });
            const idsToUpdate = existingIdsDataArray
                .flatMap((existingIdsData) => existingIdsData?.associate || []);
            await updateAssociatedAssets(idsToUpdate, updateObj);

            // for (const existingIdsData of existingIdsDataArray) {
            //     if (existingIdsData?.associate?.length > 0) {
            //         await updateAssociatedAssets(existingIdsData?.associate, updateObj);
            //     }
            // }
        }
        const activityData = {
            activityId: savedAsset?._id,
            activityModel: activityConstant?.asset,
            actionBy: clientData?._id,
            ipAddress: "0.0.0",
            activity: activityConstant?.activity?.create,
            logs: [{
                old: {

                },
                new: {
                    ...savedAsset
                }
            }]
        }

        await activityLog(activityData);



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


        let assetData = await Asset.findById(savedAsset?._id)
            .populate("createdBy", "name")
            .populate("category", "name icon color")
            .populate("subCategory", "name")
            .populate("condition", "name")
            .populate("location", "name")
            .populate("tag", "name color")
            .populate("vendor", "name")
            .populate("assignTo", "name")
            .populate("assignBy", "name")
            .populate("assignAssets", "assetId")
            .populate("associate", "assetId");
        assetData = assetData?.toObject();
        // if (assetData?.category) {
        //     assetData.category.icon = 'fas fa-'+assetData?.category?.icon;
        // }
        if (assetData.expireDateWarranty) {
            assetData.expireDateWarranty = moment(assetData?.expireDateWarranty).format('MMM DD, YYYY, hh:mm A');
        }
        if (assetData.purchasedOn) {
            assetData.purchasedOn = moment(assetData?.purchasedOn).format('MMM DD, YYYY, hh:mm A');
        }
        if (assetData.assignAt) {
            assetData.assignAt = moment(assetData?.assignAt).format('MMM DD, YYYY, hh:mm A');
        }
        if (assetData.lastAuditDate) {
            assetData.lastAuditDate = moment(assetData?.lastAuditDate).format('MMM DD, YYYY, hh:mm A');
        }
        if (assetData.createdOn) {
            assetData.actionAt = moment(assetData?.createdOn).format('MMM DD, YYYY, hh:mm A');
        }
        if (assetData.createdBy) {
            assetData.actionBy = assetData?.createdBy;
        }
        assetData.isImport = assetData?.isImport ? "Yes" : "No";
        const { status, status_class } = statusMapping[assetData?.status] || { status: "-", status_class: "-" };

        assetData.status = status;
        assetData.status_class = status_class;
        assetData.associate = assetData?.associate?.map(assetData => assetData?.assetDataId).join(",");

        console.log("assetData::::::::::::>>>>>", assetData);

        const systemAdmins = await User.find({ role: 1, isActive: true }).select('name email').exec();

        // Add mail tasks for each admin concurrently
        await Promise.all(
            systemAdmins.map(async (admin) => {
                const mailData = {
                    operation: mailOption?.operation?.add,
                    asset: assetData,
                    user: {
                        name: admin?.name,
                        email: admin?.email
                    },
                };
                console.log("admin::::::::::::>>>>>>>>>>");
                await mailQueue.add("mailTask", mailData, { delay: 10000 });
            })
        );

        // Check if there is an assigned user and add a mail task if applicable

        if (value?.assignTo) {
            const user = await User.findById(value?.assignTo)
            if (user) {
                const mailData = {
                    operation: mailOption?.operation?.assign,
                    asset: assetData,
                    user: {
                        name: user?.name,
                        email: user?.email
                    },
                };
                console.log("assign:::::::::::::>>>>>>>");

                await mailQueue.add("mailTask", mailData, { delay: 10000 });
            }
        }

        return res.status(HTTP?.SUCCESS).json({ status: HTTP?.SUCCESS, type: "addAssets", message: "Assets Add Successfully" });
    }
    catch (error) {
        console.log(error);

        if (latestFiles?.length == 0) {
            return await handleError(res, HTTP?.BAD_REQ, error.message, req?.files);
        }
        else {
            return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, savedAsset?._id);
        }
    }
};

const getUniqueIdsToAdd = (existingAssociates, newAssociates) => {
    return newAssociates?.filter((id, index, arr) => {
        return arr.indexOf(id) === index && !existingAssociates?.includes(id);
    });
};

const getIdsToRemove = (existingAssociates, newAssociates) => {
    return existingAssociates.filter(id => !newAssociates.includes(id));
};

const handleAssociateUpdateWithNullAssignTo = async (req, res, value, existingMainAsset, idsToAdd, idsToRemove, latestFiles) => {

    if (existingMainAsset?.status == assetStatus?.unavailable || existingMainAsset?.status == assetStatus?.associate) {
        return await handleError(res, HTTP?.BAD_REQ, "Asset not available", latestFiles, existingMainAsset?._id);
    }
    // ? Update associated assets to assignTo is null
    value.assignTo = null;
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

            // existingIds?.forEach(async (id) => {
            //     const existingIdsData = await Asset.findById(id);
            //     if (existingIdsData?.associate && existingIdsData?.associate?.length > 0) {
            //         await updateAssociatedAssets(existingIdsData?.associate, updateObjRemove);
            //     }
            // })

            const existingIdsDataArray = await Asset.find({ _id: { $in: existingIds } });
            const idsToUpdate = existingIdsDataArray
                .flatMap((existingIdsData) => existingIdsData?.associate || []);
            await updateAssociatedAssets(idsToUpdate, updateObjRemove);

            // await Promise.all(
            //     existingIdsDataArray.map(async (existingIdsData) => {
            //         if (existingIdsData?.associate?.length > 0) {
            //             await updateAssociatedAssets(existingIdsData?.associate, updateObjRemove);
            //         }
            //     })
            // )

        } catch (error) {
            return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
        }
    }

    // ! Check if associated assets are available
    if (!(await checkAssociatedAssets(idsToAdd))) {
        return await handleError(res, HTTP?.BAD_REQ, "Associated asset not available", latestFiles, existingMainAsset?._id);
    }

    // ! Update associated assets to remove
    if (idsToRemove && idsToRemove?.length > 0) {
        const updateObjRemoveAdditional = {
            ...updateObjRemove,
            assignAssets: null,
            isAssociate: false,
            status: assetStatus?.available,

        };
        try {
            await updateAssociatedAssets(idsToRemove, updateObjRemoveAdditional);

            // ! If associated assets have their own associated assets, update them as well
            // idsToRemove?.forEach(async (id) => {
            //     const idsToRemoveData = await Asset.findById(id);
            //     if (idsToRemoveData?.associate && idsToRemoveData?.associate?.length > 0) {
            //         await updateAssociatedAssets(idsToRemoveData?.associate, updateObjRemove);
            //     }
            // })

            const removeIdsDataArray = await Asset.find({ _id: { $in: idsToRemove } });
            const idsToUpdate = removeIdsDataArray
                .flatMap((removeIdsData) => removeIdsData?.associate || []);
            await updateAssociatedAssets(idsToUpdate, updateObjRemove);

            // await Promise.all(
            //     removeIdsDataArray.map(async (removeIdsData) => {
            //         if (removeIdsData?.associate?.length > 0) {
            //             await updateAssociatedAssets(removeIdsData?.associate, updateObjRemove);
            //         }
            //     })
            // )

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
            status: assetStatus?.associate,
        };
        try {
            await updateAssociatedAssets(idsToAdd, updateObjAdd);

            // ! If associated assets have their own associated assets, update them as well

            // idsToAdd?.forEach(async (id) => {
            //     const idsToAddData = await Asset.findById(id);
            //     if (idsToAddData?.associate && idsToAddData?.associate?.length > 0) {
            //         await updateAssociatedAssets(idsToAddData?.associate, updateObjRemove);
            //     }
            // })

            const addIdsDataArray = await Asset.find({ _id: { $in: idsToAdd } });

            const idsToUpdate = addIdsDataArray
                .flatMap((addIdsData) => addIdsData?.associate || []);
            await updateAssociatedAssets(idsToUpdate, updateObjRemove);

            // await Promise.all(
            //     addIdsDataArray.map(async (addIdsData) => {
            //         if (addIdsData?.associate?.length > 0) {
            //             await updateAssociatedAssets(addIdsData?.associate, updateObjRemove);
            //         }
            //     })
            // )

        } catch (error) {
            return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
        }
    }
};

const handleAssociateUpdate = async (req, res, value, existingMainAsset, clientData, idsToAdd, idsToRemove, latestFiles) => {

    if (existingMainAsset?.status == assetStatus?.unavailable || existingMainAsset?.status == assetStatus?.associate) {
        return await handleError(res, HTTP?.BAD_REQ, "Asset not available", latestFiles, existingMainAsset?._id);
    }

    value.assignBy = clientData?._id?.toString();
    value.lastAuditDate = Date.now();
    if (existingMainAsset?.assignTo == value?.assignTo) {
        value.assignBy = existingMainAsset?.assignBy;
        value.assignAt = existingMainAsset?.assignAt;
        value.lastAuditDate = existingMainAsset?.lastAuditDate;
    }

    // ! Check if associated assets are available
    if (!(await checkAssociatedAssets(idsToAdd))) {
        return await handleError(res, HTTP?.BAD_REQ, "Associated asset not available", latestFiles, existingMainAsset?._id);
    }

    // ! Update associated assets to remove
    if (idsToRemove && idsToRemove?.length > 0) {
        const updateObjRemove = {
            assignAssets: null,
            isAssociate: false,
            status: assetStatus?.available,
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
            // idsToRemove?.forEach(async (id) => {
            //     const idsToRemoveData = await Asset.findById(id);
            //     if (idsToRemoveData?.associate && idsToRemoveData?.associate?.length > 0) {
            //         await updateAssociatedAssets(idsToRemoveData?.associate, updateObj);
            //     }
            // })


            const removeIdsDataArray = await Asset.find({ _id: { $in: idsToRemove } });
            const idsToUpdate = removeIdsDataArray
                .flatMap((removeIdsData) => removeIdsData?.associate || []);
            await updateAssociatedAssets(idsToUpdate, updateObj);

            // await Promise.all(
            //     removeIdsDataArray.map(async (removeIdsData) => {
            //         if (removeIdsData?.associate?.length > 0) {
            //             await updateAssociatedAssets(removeIdsData?.associate, updateObj);
            //         }
            //     })
            // )

        } catch (error) {
            return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
        }
    }

    // ? Update associated assets to add
    const updateObjAdd = {
        assignAssets: existingMainAsset?._id,
        isAssociate: true,
        status: assetStatus?.associate,
        assignTo: value?.assignTo,
        assignBy: value?.assignBy,
        isAssign: value?.isAssign,
        assignAt: value?.assignAt,
        lastAuditDate: value?.lastAuditDate
    };

    // ? Update associate assets to add
    if (idsToAdd && idsToAdd?.length > 0) {
        try {
            await updateAssociatedAssets(idsToAdd, updateObjAdd);

            // ! If associated assets have their own associated assets, update them as well
            delete updateObjAdd?.assignAssets;
            // idsToAdd?.forEach(async (id) => {
            //     const idsToAddData = await Asset.findById(id);
            //     if (idsToAddData?.associate && idsToAddData?.associate?.length > 0) {
            //         await updateAssociatedAssets(idsToAddData?.associate, updateObjAdd);
            //     }
            // })


            const addIdsDataArray = await Asset.find({ _id: { $in: idsToAdd } });
            const idsToUpdate = addIdsDataArray
                .flatMap((addIdsData) => addIdsData?.associate || []);
            await updateAssociatedAssets(idsToUpdate, updateObjAdd);

            // await Promise.all(
            //     addIdsDataArray.map(async (addIdsData) => {
            //         if (addIdsData?.associate?.length > 0) {
            //             await updateAssociatedAssets(addIdsData?.associate, updateObjAdd);
            //         }
            //     })
            // )

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
            // existingIds?.forEach(async (id) => {
            //     const existingIdsData = await Asset.findById(id);
            //     if (existingIdsData?.associate && existingIdsData?.associate?.length > 0) {
            //         await updateAssociatedAssets(existingIdsData?.associate, updateObjAdd);
            //     }
            // })

            const existingIdsDataArray = await Asset.find({ _id: { $in: existingIds } });
            const idsToUpdate = existingIdsDataArray
                .flatMap((existingIdsData) => existingIdsData?.associate || []);
            await updateAssociatedAssets(idsToUpdate, updateObjAdd);

            // await Promise.all(
            //     existingIdsDataArray.map(async (existingIdsData) => {
            //         if (existingIdsData?.associate?.length > 0) {
            //             await updateAssociatedAssets(existingIdsData?.associate, updateObjAdd);
            //         }
            //     })
            // )

        } catch (error) {
            return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
        }
    }
};



/* ------------------------------- Audit Asset ------------------------------ */
/**
 * @description Handles asset audit attachment.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<Object>} JSON response with status, type, message, and data (if applicable).
 */

const auditAsset = async (req, res) => {
    try {

        // ? save file using for error then deleteation
        const latestFiles = [];

        // * Get client data using the token
        const clientData = req?.clientData;
        if (!clientData) {
            return await handleError(res, HTTP?.UNAUTHORIZED, "Unauthorized access", req?.files);
        }

        // * Check if files are present in the request and add them to the request body
        if (req?.files?.length !== 0) {
            req.body.files = req?.files;
        }
        else {
            return await handleError(res, HTTP?.BAD_REQ, "Please insert attachment", []);
        }

        const isAccess = await findUAC(clientData?._id, "assets", "assets", "edit");
        if (!isAccess) {
            return await handleError(res, HTTP?.UNAUTHORIZED, "Unauthorized access", req?.files);
        }
        else {
            return await handleAudit(req, res, clientData, latestFiles);
        }

    } catch (error) {
        return await handleError(res, HTTP?.INTERNAL_SERVER, error.message, req?.files);
    }
}

const handleAudit = async (req, res, clientData, latestFiles) => {
    try {
        const { error, value } = auditAssetValidationSchema.validate(req?.body);
        if (error) {
            return await handleError(res, HTTP?.BAD_REQ, error?.details[0]?.message, req?.files);
        }

        // ! Find the existing main asset
        const existingMainAsset = await Asset.findOne({ _id: value?.mainAssetId, isActive: true, isDeleted: false });
        if (!existingMainAsset) {
            return await handleError(res, HTTP?.NOT_FOUND, 'Asset not found', req?.files);
        }

        // * if any add files 
        if (value?.files?.length > 0 && value?.files != undefined) {

            // ! if already length is maximum then file not add
            if (existingMainAsset?.files?.length + value?.files?.length > assetAuditAttachmentLength) {
                return await handleError(res, HTTP?.BAD_REQ, "Not add more than " + assetAuditAttachmentLength + " attchment", req?.files);
            }
            else {
                await handleFileUpdate(req, res, value, existingMainAsset, latestFiles)
            }
        }

        // ? Merge existingMainAsset with new data
        const mergedData = { ...existingMainAsset?.toObject(), ...value };

        // ? Update the main asset
        try {
            const updateAssets = await Asset.findByIdAndUpdate(value?.assetId, mergedData, { new: true });

            const activityData = {
                activityId: existingMainAsset?._id,
                activityModel: activityConstant?.asset,
                actionBy: client?._id,
                ipAddress: "0.0.0",
                activity: activityConstant?.activity?.update,
                logs: [{
                    old: {
                        ...existingMainAsset
                    },
                    new: {
                        ...updateAssets
                    }
                }]
            }
            await activityLog(activityData)

        } catch (error) {
            return await handleError(res, HTTP?.BAD_REQ, error.message, latestFiles, existingMainAsset?._id);
        }

        return res.status(HTTP?.SUCCESS).json({ status: HTTP?.SUCCESS, type: "auditAssets", message: 'Asset audit successfully' });
    } catch (error) {
        return await handleError(res, HTTP?.INTERNAL_SERVER, error.message, req?.files);
    }
}





module.exports = {
    attachment,
    auditAsset
}
