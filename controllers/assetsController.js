// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const { HTTP, assetStatus, uploadDir, importDir, activityConstant, mailOption } = require("../constant/constant");

// ─────────────────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────────────────
const Asset = require("../models/assestsModel");
const importAssetModel = require("../models/importAssetData");
const Category = require("../models/categoryModel");
const Vendor = require("../models/vendorModel");
const Condition = require("../models/conditionModel");
const Location = require("../models/locationModel");
const Tag = require("../models/tagModel");
const User = require("../models/userModel");
const fs = require("fs");
const path = require("path");
// const PDFDocument = require('pdfkit');
const moment = require('moment');
const puppeteer = require('puppeteer-core');
const handlebars = require('handlebars');
const ExcelJS = require('exceljs');
const Activity = require("../models/activityModel");

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────
const { activityLog } = require("../handler/activityLog");
const { checkAssociatedAssets, updateAssociatedAssets } = require("../handler/assetUpdater");
const { pdfQueue, excelQueue, mailQueue } = require("../redis/queue");
const { addAssetValidationSchema, updateAssetValidationSchema, auditAssetValidationSchema } = require("../validation/assets/assetValidation");
const deleteValidationSchema = require("../validation/global/delete");
const showSingleValidationSchema = require("../validation/global/showSingle");
const SubCategory = require("../models/subCategoryModel");
const statusMapping = {
    [assetStatus?.available]: { status: "Available", status_class: "status-available" },
    [assetStatus?.unavailable]: { status: "Unavailable", status_class: "status-unavailable" },
    [assetStatus?.assign]: { status: "Assigned", status_class: "status-assigned" },
    [assetStatus?.associate]: { status: "Associate", status_class: "status-associate" }
};


// * ----- Add Assets -----
const addAssets = async (data, client) => {
    console.log(" ========== add assets ========== ");
    return new Promise(async (resolve, reject) => {
        try {

            // return reject({ status: HTTP?.BAD_REQ, message: 'Failed to add asset' });

            // ? Set createdBy based on client
            data.createdBy = client?._id?.toString();

            // ! Validate data using Joi schema
            const { error, value } = addAssetValidationSchema.validate(data);
            if (error) {
                return reject({ status: HTTP?.BAD_REQ, message: error?.details[0]?.message });
            }

            // ! Check if asset with the same categoryId and assetId already exists
            const existingAsset = await Asset.findOne({ category: value?.category, subCategory: value?.subCategory, assetId: value?.assetId, isActive: true, isDeleted: false });
            if (existingAsset) {
                return reject({ status: HTTP?.CONFLICT, message: 'AssetId already exists' });
            }

            // ! Fetch category data
            const categoryData = await Category.findOne({ _id: value?.category, isActive: true, isDeleted: false });
            if (!categoryData) {
                return reject({ status: HTTP?.NOT_FOUND, message: 'Category not found' });
            }
            const subCategoryData = await SubCategory.findOne({ _id: value?.subCategory, category: value?.category, isActive: true, isDeleted: false });
            if (!subCategoryData) {
                return reject({ status: HTTP?.NOT_FOUND, message: 'Sub Category not found' });
            }

            // ? if associate other assets 
            if (value?.associate && value?.associate?.length > 0) {

                // TODO ==> Use Set to ensure uniqueness
                const uniqueAssociateIds = new Set(value?.associate);
                value.associate = [...uniqueAssociateIds]; // ? Convert Set back to array

                // ! Check availability of associated assets
                if (!(await checkAssociatedAssets(value?.associate))) {
                    return reject({ status: HTTP?.BAD_REQ, message: 'Associated asset not available' });
                }

            }

            // ? assignBy base on assignTo
            value.assignBy = value?.assignTo ? client?._id?.toString() : null;

            // ? Construct asset object to save
            const asset = {
                category: value?.category,
                subCategory: value?.subCategory,
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
                isImport: value?.isImport,
                isAssign: value?.isAssign,
                createdBy: value?.createdBy,
                createdOn: value?.createdOn,
                associate: value?.associate,
                status: value?.status,
                lastAuditDate: value?.lastAuditDate
            };

            // * Save the asset
            try {
                const savedAsset = await Asset(asset).save();
                if (!savedAsset) {
                    return reject({ status: HTTP?.BAD_REQ, message: 'Failed to add asset' });
                }

                const activityData = {
                    activityId: savedAsset?._id,
                    activityModel: activityConstant?.asset,
                    actionBy: client?._id,
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

                    // value?.associate?.forEach(async (id) => {
                    //     const existingIdsData = await Asset.findById(id);
                    //     if (existingIdsData?.associate && existingIdsData?.associate?.length > 0) {
                    //         await updateAssociatedAssets(existingIdsData?.associate, updateObj);
                    //     }
                    // })

                    const existingIdsDataArray = await Asset.find({ _id: { $in: value?.associate } });

                    for (const existingIdsData of existingIdsDataArray) {
                        if (existingIdsData?.associate?.length > 0) {
                            await updateAssociatedAssets(existingIdsData?.associate, updateObj);
                        }
                    }

                }

                // ! Handle auto-increment logic if required
                if (categoryData?.assetIdType == 2) {
                    categoryData.autoInc.number = `${parseInt(categoryData?.autoInc?.number) + 1}`.padStart(categoryData?.autoInc?.number?.length, '0');
                    try {
                        await categoryData.save();
                    } catch (error) {
                        return reject({ status: HTTP?.BAD_REQ, message: 'Failed to update category' });
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
                //     assetData.category.icon = 'fas fa-' + assetData?.category?.icon;
                // }
                if (assetData?.expireDateWarranty) {
                    assetData.expireDateWarranty = moment(assetData?.expireDateWarranty).format('MMM DD, YYYY, hh:mm A');
                }
                if (assetData?.purchasedOn) {
                    assetData.purchasedOn = moment(assetData?.purchasedOn).format('MMM DD, YYYY, hh:mm A');
                }
                if (assetData?.assignAt) {
                    assetData.assignAt = moment(assetData?.assignAt).format('MMM DD, YYYY, hh:mm A');
                }
                if (assetData?.lastAuditDate) {
                    assetData.lastAuditDate = moment(assetData?.lastAuditDate).format('MMM DD, YYYY, hh:mm A');
                }
                if (assetData?.createdOn) {
                    assetData.actionAt = moment(assetData?.createdOn).format('MMM DD, YYYY, hh:mm A');
                }
                if (assetData?.createdBy) {
                    assetData.actionBy = assetData?.createdBy;
                }
                assetData.isImport = assetData?.isImport ? "Yes" : "No";
                const { status, status_class } = statusMapping[assetData?.status] || { status: "-", status_class: "-" };

                assetData.status = status;
                assetData.status_class = status_class;
                assetData.associate = assetData?.associate?.map(asset => asset?.assetId).join(",");


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

                // Return success message
                return resolve({ status: HTTP?.SUCCESS, message: 'Asset added successfully' });
            } catch (error) {
                return reject({ status: HTTP?.BAD_REQ, message: error.message });
            }
        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: 'INTERNAL SERVER ERROR' });
        }
    });
};

// * ----- Show All Assets -----
const showAllAssets = async () => {
    console.log(" ========== show all assets ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const assetsData = await Asset.find({});

            return resolve({ status: HTTP?.SUCCESS, message: "Here are all Assets", assetsData })

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
};

// * ----- Show Assets -----
const showAssets = async (data) => {
    console.log(" ========== show assets ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error?.details?.[0]?.message });

            const assetData = await Asset.findOne({ _id: value?.assetId, isActive: true, isDeleted: false }).populate("createdBy", "name").populate("deletedBy", "name").populate("assignAssets", "name assetId")
                .populate("category", "name")
                .populate("subCategory", "name")
                .populate("condition", "name")
                .populate("location", "name")
                .populate("tag", "name")
                .populate("vendor", "name")
                .populate("assignTo", "name")
                .populate("assignBy", "name")
                .populate({
                    path: 'associate',
                    populate: [
                        {
                            path: 'category', // ? Populate the category field for top-level associates
                        },
                        {
                            path: 'subCategory', // ? Populate the category field for top-level associates
                        },
                        {
                            path: 'tag', // ? Populate the tag field for top-level associates
                        },
                        {
                            path: 'location', // ? Populate the location field for top-level associates
                        },
                        {
                            path: 'condition', // ? Populate the condition field for top-level associates
                        },
                        {
                            path: "associate",
                            populate: [
                                {
                                    path: 'category', // ? Populate the category field deeper nested associates
                                },
                                {
                                    path: 'subCategory', // ? Populate the category field deeper nested associates
                                },
                                {
                                    path: 'tag', // ? Populate the tag field deeper nested associates
                                },
                                {
                                    path: 'location', // ? Populate the location field deeper nested associates
                                },
                                {
                                    path: 'condition', // ? Populate the condition field deeper nested associates
                                },
                            ]

                        }
                    ]
                });
            if (!assetData) return reject({ status: HTTP?.NOT_FOUND, message: 'Asset not found' });

            return resolve({ status: HTTP?.SUCCESS, message: "Here is Asset", assetData })

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
};

// * ----- Show Available Assets -----
const showAvailableAssets = async (data) => {
    console.log(" ========== show available assets ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { name } = data;

            // Construct the search query
            const query = {
                $or: [
                    { name: { $regex: new RegExp(name, 'i') } },
                    { assetId: { $regex: new RegExp(name, 'i') } },
                ], // Case-insensitive search
                status: assetStatus?.available, // Only available assets
                isActive: true, // Only activate assets
                isDeleted: false // Only non deleted assets
            };

            // Perform the search
            const assets = await Asset.find(query);

            return resolve({ status: HTTP?.SUCCESS, data: assets });

        } catch (error) {

            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
};

// * ----- Update Assets -----
const updateAssets = async (data, client) => {
    console.log(" ========== update asset ========== ");
    return new Promise(async (resolve, reject) => {

        try {

            // ! Validate the update data separately
            const { error, value } = updateAssetValidationSchema.validate(data);
            if (error) {
                return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });
            }

            // ! Fetch the existing asset from the database
            const existingMainAsset = await Asset.findOne({ _id: value?.mainAssetId, isActive: true, isDeleted: false });
            if (!existingMainAsset) {
                return reject({ status: HTTP?.NOT_FOUND, message: 'Asset not found' });
            }

            const isSubCategoryChanged = existingMainAsset?.subCategory != value?.subCategory;
            const isAssetIdChanged = existingMainAsset?.assetId != value?.assetId;

            if (isSubCategoryChanged || isAssetIdChanged) {
                // ! Check for sub category if changed
                if (isSubCategoryChanged) {
                    const subCategoryData = await SubCategory.findOne({ _id: value?.subCategory, category: value?.category, isActive: true, isDeleted: false });
                    if (!subCategoryData) {
                        return reject({ status: HTTP?.NOT_FOUND, message: 'Sub Category not found' });
                    }
                }

                // ! Check for asset ID conflicts if either changed
                const existingAsset = await Asset.findOne({ category: value?.category, subCategory: value?.subCategory, assetId: value?.assetId, isActive: true, isDeleted: false });
                if (existingAsset) {
                    return reject({ status: HTTP?.CONFLICT, message: 'AssetId already exists' });
                }
            }

            // ! Check for asset is parallelly associate
            if (value?.associate?.includes(value?.mainAssetId)) {
                return reject({ status: HTTP?.BAD_REQ, message: 'Asset not associate parallelly' });
            }

            // ? ids added ===> with removed conflicts ids & not existing ids ----> uniqueness
            const idsToAdd = value?.associate?.filter((id, index, arr) => {
                return arr?.indexOf(id) === index && !existingMainAsset?.associate?.includes(id);
            });

            // ? ids removed
            const idsToRemove = existingMainAsset?.associate?.filter(id => !value?.associate?.includes(id?.toString()));

            if (existingMainAsset?.status == assetStatus?.associate) {
                Object.assign(value, {
                    assignTo: existingMainAsset?.assignTo,
                    assignBy: existingMainAsset?.assignBy,
                    assignAt: existingMainAsset?.assignAt,
                    isAssign: existingMainAsset?.isAssign,
                    isAssociate: existingMainAsset?.isAssociate,
                    assignAssets: existingMainAsset?.assignAssets,
                    associate: existingMainAsset?.associate,
                    status: existingMainAsset?.status,
                    lastAuditDate: existingMainAsset?.lastAuditDate,
                });
            }
            else {

                // * when associate inlcude [] and assignTo both update
                if (value?.associate && value?.assignTo) {
                    if (existingMainAsset?.status == assetStatus?.unavailable || existingMainAsset?.status == assetStatus?.associate) {
                        return reject({ status: HTTP?.BAD_REQ, message: 'Asset not available' });
                    }

                    value.assignBy = client?._id?.toString();
                    value.lastAuditDate = Date.now();

                    if (existingMainAsset?.assignTo == value?.assignTo) {
                        value.assignBy = existingMainAsset?.assignBy;
                        value.assignAt = existingMainAsset?.assignAt;
                        value.lastAuditDate = existingMainAsset?.lastAuditDate;
                    }

                    // ! Check availability of associated assets
                    if (!(await checkAssociatedAssets(idsToAdd))) {
                        return reject({ status: HTTP?.BAD_REQ, message: 'Associated asset not available' });
                    }

                    // ? Validate and process associated assets to be removed like not include in new Id
                    if (idsToRemove && idsToRemove?.length > 0) {

                        // updated fields
                        const updateObjRemove = {
                            assignAssets: null,
                            isAssociate: false,
                            status: assetStatus?.available,
                            assignTo: null,
                            assignBy: null,
                            isAssign: false,
                            assignAt: null
                        };

                        // ! Update each associated asset to be removed
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

                            // for (const removeIdsData of removeIdsDataArray) {
                            //     if (removeIdsData?.associate?.length > 0) {
                            //         await updateAssociatedAssets(removeIdsData?.associate, updateObj);
                            //     }
                            // }

                        } catch (error) {
                            return reject({ status: HTTP?.BAD_REQ, message: error.message });
                        }
                    }

                    // ? Update associated assets to be added
                    if (idsToAdd && idsToAdd?.length > 0) {
                        const updateObj = {
                            assignAssets: existingMainAsset?._id,
                            isAssociate: true,
                            status: assetStatus?.associate,
                            assignTo: value?.assignTo,
                            assignBy: value?.assignBy,
                            isAssign: value?.isAssign,
                            assignAt: value?.assignAt,
                            lastAuditDate: value?.lastAuditDate
                        };

                        // ? Update each associated asset to be added
                        try {
                            await updateAssociatedAssets(idsToAdd, updateObj);

                            // ! If associated assets have their own associated assets, update them as well
                            delete updateObj?.assignAssets
                            // idsToAdd?.forEach(async (id) => {
                            //     const idsToAddData = await Asset.findById(id);
                            //     if (idsToAddData?.associate && idsToAddData?.associate?.length > 0) {
                            //         await updateAssociatedAssets(idsToAddData?.associate, updateObj);
                            //     }
                            // })

                            const addIdsDataArray = await Asset.find({ _id: { $in: idsToAdd } });
                            const idsToUpdate = addIdsDataArray
                                .flatMap((addIdsData) => addIdsData?.associate || []);
                            await updateAssociatedAssets(idsToUpdate, updateObj);

                            // for (const addIdsData of addIdsDataArray) {
                            //     if (addIdsData?.associate?.length > 0) {
                            //         await updateAssociatedAssets(addIdsData?.associate, updateObj);
                            //     }
                            // }

                        } catch (error) {
                            return reject({ status: HTTP?.BAD_REQ, message: error.message });
                        }
                    }

                    // TODO ==> existingIds to same from new Ids bcz if new assignTo is not in exstingId
                    const existingIds = existingMainAsset?.associate?.filter(id => value?.associate?.includes(id?.toString()));
                    if (existingIds && existingIds?.length > 0) {
                        const updateObj = {
                            assignAssets: existingMainAsset?._id,
                            isAssociate: true,
                            status: assetStatus?.associate,
                            assignTo: value?.assignTo,
                            assignBy: value?.assignBy,
                            isAssign: value?.isAssign,
                            assignAt: value?.assignAt,
                            lastAuditDate: value?.lastAuditDate
                        };

                        // ? Update each associated asset to be added
                        try {
                            await updateAssociatedAssets(existingIds, updateObj);

                            // ! If associated assets have their own associated assets, update them as well
                            delete updateObj?.assignAssets;
                            // existingIds?.forEach(async (id) => {
                            //     const existingIdsData = await Asset.findById(id);
                            //     if (existingIdsData?.associate && existingIdsData?.associate?.length > 0) {
                            //         await updateAssociatedAssets(existingIdsData?.associate, updateObj);
                            //     }
                            // })

                            const existingIdsDataArray = await Asset.find({ _id: { $in: existingIds } });
                            const idsToUpdate = existingIdsDataArray
                                .flatMap((existingIdsData) => existingIdsData?.associate || []);
                            await updateAssociatedAssets(idsToUpdate, updateObj);

                            // for (const existingIdsData of existingIdsDataArray) {
                            //     if (existingIdsData?.associate?.length > 0) {
                            //         await updateAssociatedAssets(existingIdsData?.associate, updateObj);
                            //     }
                            // }

                        } catch (error) {
                            return reject({ status: HTTP?.BAD_REQ, message: error.message });
                        }
                    }
                }

                // * when assignTo update
                else if (value?.assignTo) {

                    if (existingMainAsset?.status == assetStatus?.unavailable || existingMainAsset?.status == assetStatus?.associate) {
                        return reject({ status: HTTP?.BAD_REQ, message: 'Asset not available' });
                    }

                    value.assignBy = client?._id?.toString();
                    value.lastAuditDate = Date.now();
                    if (existingMainAsset?.assignTo == value?.assignTo) {
                        value.assignBy = existingMainAsset?.assignBy;
                        value.assignAt = existingMainAsset?.assignAt;
                        value.lastAuditDate = existingMainAsset?.lastAuditDate;
                    }

                    // ! Check availability of associated assets
                    if (!(await checkAssociatedAssets(idsToAdd))) {
                        return reject({ status: HTTP?.BAD_REQ, message: 'Associated asset not available' });
                    }

                    // ? Validate and process associated assets to be removed like not include in new Id
                    if (idsToRemove && idsToRemove?.length > 0) {

                        // updated fields
                        const updateObjRemove = {
                            assignAssets: null,
                            isAssociate: false,
                            status: assetStatus?.available,
                            assignTo: null,
                            assignBy: null,
                            isAssign: false,
                            assignAt: null
                        };

                        // ! Update each associated asset to be removed
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

                            // for (const removeIdsData of removeIdsDataArray) {
                            //     if (removeIdsData?.associate?.length > 0) {
                            //         await updateAssociatedAssets(removeIdsData?.associate, updateObj);
                            //     }
                            // }

                        } catch (error) {
                            return reject({ status: HTTP?.BAD_REQ, message: error.message });
                        }
                    }

                    // ? Update associated assets to be added
                    if (idsToAdd && idsToAdd?.length > 0) {
                        const updateObj = {
                            assignAssets: existingMainAsset?._id,
                            isAssociate: true,
                            status: assetStatus?.associate,
                            assignTo: value?.assignTo,
                            assignBy: value?.assignBy,
                            isAssign: value?.isAssign,
                            assignAt: value?.assignAt,
                            lastAuditDate: value?.lastAuditDate
                        };

                        // ? Update each associated asset to be added
                        try {
                            await updateAssociatedAssets(idsToAdd, updateObj);

                            // ! If associated assets have their own associated assets, update them as well
                            delete updateObj?.assignAssets
                            // idsToAdd?.forEach(async (id) => {
                            //     const idsToAddData = await Asset.findById(id);
                            //     if (idsToAddData?.associate && idsToAddData?.associate?.length > 0) {
                            //         await updateAssociatedAssets(idsToAddData?.associate, updateObj);
                            //     }
                            // })


                            const addIdsDataArray = await Asset.find({ _id: { $in: idsToAdd } });
                            const idsToUpdate = addIdsDataArray
                                .flatMap((addIdsData) => addIdsData?.associate || []);
                            await updateAssociatedAssets(idsToUpdate, updateObj);

                            // for (const addIdsData of addIdsDataArray) {
                            //     if (addIdsData?.associate?.length > 0) {
                            //         await updateAssociatedAssets(addIdsData?.associate, updateObj);
                            //     }
                            // }

                        } catch (error) {
                            return reject({ status: HTTP?.BAD_REQ, message: error.message });
                        }
                    }

                    // TODO ==> existingIds to same from new Ids bcz if new assignTo is not in exstingId
                    const existingIds = existingMainAsset?.associate?.filter(id => value?.associate?.includes(id?.toString()));
                    if (existingIds && existingIds?.length > 0) {
                        const updateObj = {
                            assignAssets: existingMainAsset?._id,
                            isAssociate: true,
                            status: assetStatus?.associate,
                            assignTo: value?.assignTo,
                            assignBy: value?.assignBy,
                            isAssign: value?.isAssign,
                            assignAt: value?.assignAt,
                            lastAuditDate: value?.lastAuditDate
                        };

                        // ? Update each associated asset to be added
                        try {
                            await updateAssociatedAssets(existingIds, updateObj);

                            // ! If associated assets have their own associated assets, update them as well
                            delete updateObj?.assignAssets;
                            // existingIds?.forEach(async (id) => {
                            //     const existingIdsData = await Asset.findById(id);
                            //     if (existingIdsData?.associate && existingIdsData?.associate?.length > 0) {
                            //         await updateAssociatedAssets(existingIdsData?.associate, updateObj);
                            //     }
                            // })



                            const existingIdsDataArray = await Asset.find({ _id: { $in: existingIds } });

                            const idsToUpdate = existingIdsDataArray
                                .flatMap((existingIdsData) => existingIdsData?.associate || []);
                            await updateAssociatedAssets(idsToUpdate, updateObj);

                            // for (const existingIdsData of existingIdsDataArray) {
                            //     if (existingIdsData?.associate?.length > 0) {
                            //         await updateAssociatedAssets(existingIdsData?.associate, updateObj);
                            //     }
                            // }

                        } catch (error) {
                            return reject({ status: HTTP?.BAD_REQ, message: error.message });
                        }
                    }
                }

                // ! when assignTo is null
                // * when assignTo is null but associate include [] available
                else if (value?.associate) {
                    if (existingMainAsset?.status == assetStatus?.unavailable || existingMainAsset?.status == assetStatus?.associate) {
                        return reject({ status: HTTP?.BAD_REQ, message: 'Asset not available' });
                    }
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


                            // for (const existingIdsData of existingIdsDataArray) {
                            //     if (existingIdsData?.associate?.length > 0) {
                            //         await updateAssociatedAssets(existingIdsData?.associate, updateObjRemove);
                            //     }
                            // }

                        } catch (error) {
                            return reject({ status: HTTP?.BAD_REQ, message: error.message });
                        }
                    }

                    // ! Check availability of associated assets
                    if (!(await checkAssociatedAssets(idsToAdd))) {
                        return reject({ status: HTTP?.BAD_REQ, message: 'Associated asset not available' });
                    }

                    // ! Validate and process associated assets to be removed like not include in new Id
                    if (idsToRemove && idsToRemove?.length > 0) {
                        const updateObj = {
                            assignAssets: null,
                            isAssociate: false,
                            status: assetStatus?.available,
                            ...updateObjRemove
                        };

                        // ! Update each associated asset to be removed
                        try {
                            await updateAssociatedAssets(idsToRemove, updateObj);

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

                            // for (const removeIdsData of removeIdsDataArray) {
                            //     if (removeIdsData?.associate?.length > 0) {
                            //         await updateAssociatedAssets(removeIdsData?.associate, updateObjRemove);
                            //     }
                            // }
                        } catch (error) {
                            return reject({ status: HTTP?.BAD_REQ, message: error.message });
                        }
                    }

                    // ? Update associated assets to be added
                    if (idsToAdd && idsToAdd?.length > 0) {
                        const updateObj = {
                            assignAssets: existingMainAsset?._id,
                            isAssociate: true,
                            status: assetStatus?.associate,
                            ...updateObjRemove
                        };

                        // ? Update each associated asset to be added
                        try {
                            await updateAssociatedAssets(idsToAdd, updateObj);

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

                            // for (const addIdsData of addIdsDataArray) {
                            //     if (addIdsData?.associate?.length > 0) {
                            //         await updateAssociatedAssets(addIdsData?.associate, updateObjRemove);
                            //     }
                            // }

                        } catch (error) {
                            return reject({ status: HTTP?.BAD_REQ, message: error.message });
                        }
                    }
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

                return resolve({ status: HTTP?.SUCCESS, message: 'Asset updated successfully' });
            } catch (error) {
                return reject({ status: HTTP?.BAD_REQ, message: error.message });
            }
        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: 'INTERNAL SERVER ERROR' });
        }
    });
};

// * ----- Delete Assets -----
const deleteAssets = async (data, client) => {
    console.log(" ========== delete asset ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            data.deletedBy = client?._id?.toString();
            data.isDeleted = true;
            data.deletedOn = Date.now();
            const { error, value } = deleteValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error?.details?.[0]?.message });

            // Fetch the existing asset from the database
            const existingAsset = await Asset.findOne({ _id: value?.assetId, isActive: true });
            if (!existingAsset) return reject({ status: HTTP?.NOT_FOUND, message: 'Asset not found' });

            if (existingAsset?.isDeleted) return resolve({ status: HTTP?.SUCCESS, message: 'Asset already deleted' });

            if (existingAsset?.assignAssets || existingAsset?.isAssociate || existingAsset?.status == assetStatus?.associate) {
                // await Asset.findByIdAndUpdate(existingAsset?.assignAssets, {
                //     $pull: {
                //         associate: existingAsset?._id
                //     }
                // });
                // existingAsset.assignTo = null;
                // existingAsset.assignBy = null;
                // existingAsset.isAssign = false;
                // existingAsset.assignAt = null;
                // existingAsset.assignAssets = null;
                // existingAsset.isAssociate = false;
                // existingAsset.status = assetStatus?.available;
                return resolve({ status: HTTP?.BAD_REQ, message: 'Asset already assigned to another asset' });
            }
            if (existingAsset?.status == assetStatus?.assign || existingAsset?.assignTo) {
                return resolve({ status: HTTP?.BAD_REQ, message: 'Asset already assigned to an user' });
            }
            if (existingAsset?.associate) {
                const deleteObj = {
                    isDeleted: value?.isDeleted,
                    deletedBy: value?.deletedBy,
                    deletedOn: value?.deletedOn,
                    assignTo: null,
                    isAssign: false,
                    assignAt: null,
                    assignAssets: null,
                    isAssociate: false,
                    status: assetStatus?.available,
                }
                const ids = existingAsset?.associate;

                // Update all associated assets in one query
                await Asset.updateMany(
                    { _id: { $in: ids } }, // Match all associated asset IDs
                    deleteObj // Apply the delete operation to all matched assets
                );

                // Remove all IDs from the associate array in one query
                await Asset.findByIdAndUpdate(value?.assetId, {
                    $pull: { associate: { $in: ids } } // Pull all IDs from the associate array
                });
            }

            // Update only the fields that have changed in the existingAsset
            Object.keys(value).forEach(key => {
                if (value[key] && existingAsset[key] != value[key]) {
                    existingAsset[key] = value[key];
                }
            });

            // Save the deleted Asset
            const deletedAsset = await existingAsset.save();

            return resolve({ status: HTTP?.SUCCESS, message: 'Asset deleted successfully', asset: deletedAsset });

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
};

// * ----- Audit Assets -----
const auditAssets = async (data, client) => {
    console.log(" ========== audit assets ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = auditAssetValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error?.details?.[0]?.message });

            const existingAsset = await Asset.findOne({ _id: value?.mainAssetId, isActive: true, isDeleted: false })
            if (!existingAsset) return reject({ status: HTTP?.NOT_FOUND, message: 'Asset not found' });

            const updateAssets = await Asset.findOneAndUpdate({ _id: value?.mainAssetId, isActive: true, isDeleted: false }, value)
            if (!updateAssets) return reject({ status: HTTP?.NOT_FOUND, message: 'Asset not found' });

            const activityData = {
                activityId: existingAsset?._id,
                activityModel: activityConstant?.asset,
                actionBy: client?._id,
                ipAddress: "0.0.0",
                activity: activityConstant?.activity?.update,
                logs: [{
                    old: {
                        ...existingAsset
                    },
                    new: {
                        ...updateAssets
                    }
                }]
            }
            await activityLog(activityData)
            return resolve({ status: HTTP?.SUCCESS, message: "Asset Audit complete" })

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
};

// * ----- Activity Assets -----
const activityAsset = async (data) => {
    console.log(" ========== activity assets ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);

            if (error) return reject({ status: HTTP?.BAD_REQ, message: error?.details?.[0]?.message });

            const existingAsset = await Asset.findOne({ _id: value?.assetId, isActive: true, isDeleted: false });
            if (!existingAsset) return reject({ status: HTTP?.NOT_FOUND, message: 'Asset not found' });

            const activityData = await Activity.find({ activityId: value?.assetId }).sort({ "_id": -1 }).populate("actionBy", "name");

            return resolve({ status: HTTP?.SUCCESS, message: "Here are activity Asset", activityData });

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    })
};

// * ----- Activity Assets Excel -----
/* ------------------------------ side by side ------------------------------ */
const activityAssetExcel = async () => {
    console.log(" ========== Activity Asset Excel ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const statusMapping = {
                [assetStatus?.available]: "Available",
                [assetStatus?.unavailable]: "Unavailable",
                [assetStatus?.assign]: "Assigned",
                [assetStatus?.associate]: "Associate"
            };
            const data = await Activity.find({ activityModel: activityConstant?.asset })
                .populate("actionBy")
                .lean(); // Use .lean() to make the data a plain JavaScript object

            // Manually populate the nested fields in logs
            for (let activity of data) {
                for (let logEntry of activity?.logs) {
                    if (logEntry.old) {
                        logEntry.old = await populateNestedFields(logEntry?.old);
                    }
                    if (logEntry.new) {
                        logEntry.new = await populateNestedFields(logEntry?.new);
                    }
                }
            }

            async function populateNestedFields(log) {

                // Populate all the fields that you want to populate
                if (log.category) {
                    log.category = await Category.findById(log?.category);
                    log.category = log?.category?.name
                }
                if (log.subCategory) {
                    log.subCategory = await SubCategory.findById(log?.subCategory);
                    log.subCategory = log?.subCategory?.name
                }
                if (log.vendor) {
                    log.vendor = await Vendor.findById(log?.vendor);
                    log.vendor = log?.vendor?.name
                }
                if (log.condition) {
                    log.condition = await Condition.findById(log?.condition);
                    log.condition = log?.condition?.name
                }
                if (log.location) {
                    log.location = await Location.findById(log?.location);
                    log.location = log?.location?.name
                }
                if (log.tag) {
                    log.tag = await Tag.findById(log?.tag);
                    log.tag = log?.tag?.name
                }
                if (log.files) {
                    log.files = log?.files?.map(file => {
                        return file?.path
                    })
                }
                if (log.assignTo) {
                    log.assignTo = await User.findById(log?.assignTo);
                    log.assignTo = log?.assignTo?.name
                }
                if (log.assignBy) {
                    log.assignBy = await User.findById(log?.assignBy);
                    log.assignBy = log?.assignBy?.name
                }
                if (log.associate) {
                    log.associate = await Asset.find({ associate: { $in: log?.associate } });
                    log.associate = log?.associate?.map(val => {
                        return val?.assetId
                    }).join(",");
                }
                if (log.assignAssets) {
                    log.assignAssets = await Asset.findById(log.assignAssets);
                    log.assignAssets = log?.assignAssets?.assetId
                }
                if (log.purchasedOn) {
                    log.purchasedOn = moment(log?.purchasedOn).format("DD-MM-YYYY")
                }
                if (log.assignAt) {
                    log.assignAt = moment(log?.assignAt).format("DD-MM-YYYY")
                }
                if (log.expireDateWarranty) {
                    log.expireDateWarranty = moment(log?.expireDateWarranty).format("DD-MM-YYYY")
                }
                if (log.lastAuditDate) {
                    log.lastAuditDate = moment(log?.lastAuditDate).format("DD-MM-YYYY")
                }
                if (log.status) {
                    log.status = statusMapping[log?.status]
                }
                if (log.price) {
                    log.price = Number(log?.price)
                }

                return log;
            }
            const fileName = `Asset_Activity_${moment().format("DD-MM-YYYY_H-mm-ss")}.xlsx`;
            const filePath = path.join(importDir, fileName);

            /* ------------------------------ without color ----------------------------- */
            if (!fs.existsSync(filePath)) {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Asset Activity Logs');

                // Define the main headers
                // worksheet.mergeCells('A1:D1'); // Activity
                // worksheet.getCell('A1').value = 'Activity';
                // worksheet.getCell('A1').alignment = { horizontal: 'center' };
                // worksheet.getCell('A1').font = { bold: true };

                // worksheet.mergeCells('E1:X1'); // Old Data
                // worksheet.getCell('E1').value = 'Old Data';
                // worksheet.getCell('E1').alignment = { horizontal: 'center' };
                // worksheet.getCell('E1').font = { bold: true };

                // worksheet.mergeCells('Z1:AR1'); // New Data
                // worksheet.getCell('Z1').value = 'New Data';
                // worksheet.getCell('Z1').alignment = { horizontal: 'center' };
                // worksheet.getCell('Z1').font = { bold: true };

                // Define the sub-headers in row 3
                // worksheet.getRow(3).values = [
                //     "Date", "Action By", "IP Address", " ",   // Activity sub-headers
                //     'Category', 'AssetId', 'Name', 'Vendor', 'PurschaseOn (DD-MM-YYYY)', 'Serial Number', 'Expire Date Warranty (DD-MM-YYYY)', 'Expire Warranty Notify', 'Price', 'Location', 'Tag', 'Condition', 'Assign To', 'Assign By', 'Assign At (DD-MM-YYYY)', 'Description', 'Assign Assets', 'Associate', 'Status', 'Last Audit Date (DD-MM-YYYY)', ' ',  // Old Data headers
                //     'Category', 'AssetId', 'Name', 'Vendor', 'PurschaseOn (DD-MM-YYYY)', 'Serial Number', 'Expire Date Warranty (DD-MM-YYYY)', 'Expire Warranty Notify', 'Price', 'Location', 'Tag', 'Condition', 'Assign To', 'Assign By', 'Assign At (DD-MM-YYYY)', 'Description', 'Assign Assets', 'Associate', 'Status', 'Last Audit Date (DD-MM-YYYY)'  // New Data headers
                // ];

                worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
                    cell.font = { bold: true };
                });

                // Set column widths (optional)
                worksheet.columns = [
                    { width: 25, header: "Date" }, // Column A - Date
                    { width: 20, header: "Action By" }, // Column B - Action By
                    { width: 25, header: "Ip Address" }, // Column C - IP Address

                    { width: 10 }, // Column D - Empty for Activity

                    { width: 20, header: "Old Category" }, // Column E - Old Data Category
                    { width: 20, header: "New Category" }, // Column F - New Data Category
                    { width: 20, header: "Old Sub Category" }, // Column G - Old Data Category
                    { width: 20, header: "New Sub Category" }, // Column H - New Data Category
                    { width: 20, header: "Old Asset Id" }, // Column I - Old Data AssetId
                    { width: 20, header: "New Asset Id" }, // Column J - New Data AssetId
                    { width: 20, header: "Old Name" }, // Column K - Old Data Name
                    { width: 20, header: "New Name" }, // Column L - new Data Name
                    { width: 20, header: "Old Vendor" }, // Column M - Old Data Vendor
                    { width: 20, header: "New Vendor" }, // Column N - New Data Vendor
                    { width: 35, header: "Old Purschase on (DD-MM-YYYY)" }, // Column O - Old Data Purschase on (DD-MM-YYYY)
                    { width: 35, header: "New Purschase on (DD-MM-YYYY)" }, // Column P - New Data Purschase on (DD-MM-YYYY)
                    { width: 25, header: "Old Serial Number" }, // Column Q - Old Data Serial Number
                    { width: 25, header: "New Serial Number" }, // Column R - New Data Serial Number
                    { width: 35, header: "Old Expire Date Warranty (DD-MM-YYYY)" }, // Column S - Old Data Expire Date Warranty (DD-MM-YYYY)
                    { width: 35, header: "New Expire Date Warranty (DD-MM-YYYY)" }, // Column T - New Data Expire Date Warranty (DD-MM-YYYY)
                    { width: 25, header: "Old Expire Warranty Notify" }, // Column U - Old Data Expire Warranty Notify
                    { width: 25, header: "New Expire Warranty Notify" }, // Column V - New Data Expire Warranty Notify
                    { width: 20, header: "Old Price" }, // Column W - Old Data Price
                    { width: 20, header: "New Price" }, // Column X - New Data Price
                    { width: 20, header: "Old Location" }, // Column Y - Old Data Location
                    { width: 20, header: "New Location" }, // Column Z - New Data Location
                    { width: 20, header: "Old Tag" }, // Column AA - Old Data Tag
                    { width: 20, header: "New Tag" }, // Column AB - New Data Tag
                    { width: 20, header: "Old Condition" }, // Column AC - Old Data Condition
                    { width: 20, header: "New Condition" }, // Column AD - New Data Condition
                    { width: 20, header: "Old Assign To" }, // Column AE - Old Data Assign To
                    { width: 20, header: "New Assign To" }, // Column AF - New Data Assign To
                    { width: 20, header: "Old Assign By" }, // Column AG - Old Data Assign By
                    { width: 20, header: "New Assign By" }, // Column AH - New Data Assign By
                    { width: 30, header: "Old Assign At (DD-MM-YYYY)" }, // Column AI - Old Data Assign At (DD-MM-YYYY)
                    { width: 30, header: "New Assign At (DD-MM-YYYY)" }, // Column AJ - New Data Assign At (DD-MM-YYYY)
                    { width: 30, header: "Old Description" }, // Column AK - Old Data Description
                    { width: 30, header: "New Description" }, // Column AL - New Data Description
                    { width: 20, header: "Old Assign Asset" }, // Column AM - Old Data Assign Assets
                    { width: 20, header: "New Assign Asset" }, // Column AN - New Data Assign Assets
                    { width: 30, header: "Old Associate" }, // Column AO - Old Data Associate
                    { width: 30, header: "New Associate" }, // Column AP - New Data Associate
                    { width: 20, header: "Old Status" }, // Column AQ - Old Data Status
                    { width: 20, header: "New Status" }, // Column AR - New Data Status
                    { width: 35, header: "Old Last Audit Date (DD-MM-YYYY)" }, // Column AS - Old Data Last Audit Date (DD-MM-YYYY)
                    { width: 35, header: "New Last Audit Date (DD-MM-YYYY)" }, // Column AT - New Data Last Audit Date (DD-MM-YYYY)
                ];


                let currentRow = 2; // Start from row 4 for data

                // Add data to the worksheet
                if (data?.length > 0) {
                    data.forEach((activity) => {
                        activity.logs.forEach((log) => {
                            const oldData = log.old || {};
                            const newData = log.new || {};
                            const isCreated = Object.keys(oldData).length === 0; // Check if oldData is empty

                            if (isCreated) {
                                // Add a row for "Created" with merged cells for old data
                                worksheet.getCell(`A${currentRow}`).value = moment(activity.date).format('MMM DD, YYYY, hh:mm A') || '';
                                worksheet.getCell(`B${currentRow}`).value = activity.actionBy.name || '';
                                worksheet.getCell(`C${currentRow}`).value = activity.ipAddress || '';
                                worksheet.getCell(`D${currentRow}`).value = ''; // Empty cell for spacing

                                worksheet.getCell(`F${currentRow}`).value = newData.category || '';
                                worksheet.getCell(`F${currentRow}`).value = newData.subCategory || '';
                                worksheet.getCell(`H${currentRow}`).value = newData.assetId || '';
                                worksheet.getCell(`J${currentRow}`).value = newData.name || '';
                                worksheet.getCell(`L${currentRow}`).value = newData.vendor || '';
                                worksheet.getCell(`N${currentRow}`).value = newData.purchasedOn || '';
                                worksheet.getCell(`P${currentRow}`).value = newData.serialNumber || '';
                                worksheet.getCell(`R${currentRow}`).value = newData.expireDateWarranty || '';
                                worksheet.getCell(`T${currentRow}`).value = newData.expireWarrantyNotify || '';
                                worksheet.getCell(`V${currentRow}`).value = newData.price || '';
                                worksheet.getCell(`X${currentRow}`).value = newData.location || '';
                                worksheet.getCell(`Z${currentRow}`).value = newData.tag || '';
                                worksheet.getCell(`AB${currentRow}`).value = newData.condition || '';
                                worksheet.getCell(`AD${currentRow}`).value = newData.assignTo || '';
                                worksheet.getCell(`AF${currentRow}`).value = newData.assignBy || '';
                                worksheet.getCell(`AH${currentRow}`).value = newData.assignAt || '';
                                worksheet.getCell(`AJ${currentRow}`).value = newData.description || '';
                                worksheet.getCell(`AL${currentRow}`).value = newData.assignAssets || '';
                                worksheet.getCell(`AN${currentRow}`).value = newData.associate || '';
                                worksheet.getCell(`AP${currentRow}`).value = newData.status || '';
                                worksheet.getCell(`AR${currentRow}`).value = newData.lastAuditDate || '';
                            } else {
                                // Add a row for regular data
                                worksheet.addRow([
                                    moment(activity.date).format('MMM DD, YYYY, hh:mm A') || '',
                                    activity.actionBy.name || '',
                                    activity.ipAddress || '',
                                    '',
                                    oldData.category || '',
                                    newData.category || '',
                                    oldData.subCategory || '',
                                    newData.subCategory || '',
                                    oldData.assetId || '',
                                    newData.assetId || '',
                                    oldData.name || '',
                                    newData.name || '',
                                    oldData.vendor || '',
                                    newData.vendor || '',
                                    oldData.purchasedOn || '',
                                    newData.purchasedOn || '',
                                    oldData.serialNumber || '',
                                    newData.serialNumber || '',
                                    oldData.expireDateWarranty || '',
                                    newData.expireDateWarranty || '',
                                    oldData.expireWarrantyNotify || '',
                                    newData.expireWarrantyNotify || '',
                                    oldData.price || '',
                                    newData.price || '',
                                    oldData.location || '',
                                    newData.location || '',
                                    oldData.tag || '',
                                    newData.tag || '',
                                    oldData.condition || '',
                                    newData.condition || '',
                                    oldData.assignTo || '',
                                    newData.assignTo || '',
                                    oldData.assignBy || '',
                                    newData.assignBy || '',
                                    oldData.assignAt || '',
                                    newData.assignAt || '',
                                    oldData.description || '',
                                    newData.description || '',
                                    oldData.assignAssets || '',
                                    newData.assignAssets || '',
                                    oldData.associate || '',
                                    newData.associate || '',
                                    oldData.status || '',
                                    newData.status || '',
                                    oldData.lastAuditDate || '',
                                    newData.lastAuditDate || '',
                                ]);

                            }


                            // Move to the next row
                            currentRow += 1;
                        });
                    });
                }

                // Write the file
                await workbook.xlsx.writeFile(filePath);
            }

            await excelQueue.add("excelTask", { filePath }, { delay: 10000 });
            return resolve({ fileName, filePath, });

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    })
};

// * ----- Import Assets -----
const importAssetData = async (client) => {
    console.log(" ========== import asset ========== ");
    return new Promise(async (resolve, reject) => {
        try {

            const importData = await importAssetModel.find({ importBy: client?._id })
            return resolve({ status: HTTP?.SUCCESS, message: 'Here are import Asset', importData });

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
};

// * ----- PDF Assets -----
const getPdfAsset = async () => {
    console.log(" ========== get pdf asset ========== ");
    return new Promise(async (resolve, reject) => {
        try {

            const formatAssociate = (items, itemsPerLine) => {
                const assetIds = items.map(item => item?.assetId);
                let formattedString = '';

                for (let i = 0; i < assetIds.length; i += itemsPerLine) {
                    formattedString += assetIds.slice(i, i + itemsPerLine) + ',<br>';
                }

                return formattedString;
            };

            const browser = await puppeteer.launch(
                {
                    executablePath: path.join(__dirname, "..", 'node_modules', 'chromium', 'lib', 'chromium', 'chrome-win', 'chrome.exe'),
                    args: ["--no-sandbox", "--disable-setuid-sandbox"],
                    timeout: 0,
                }
            );
            const page = await browser.newPage();
            let assets = await Asset.find({ isActive: true, isDeleted: false })
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

            assets = assets?.map(asset => asset?.toObject());
            assets.forEach(asset => {
                if (asset?.expireDateWarranty) {
                    asset.expireDateWarranty = moment(asset?.expireDateWarranty).format('DD-MM-YYYY');
                }
                if (asset?.purchasedOn) {
                    asset.purchasedOn = moment(asset?.purchasedOn).format('DD-MM-YYYY');
                }
                if (asset?.assignAt) {
                    asset.assignAt = moment(asset?.assignAt).format('DD-MM-YYYY');
                }
                if (asset?.lastAuditDate) {
                    asset.lastAuditDate = moment(asset?.lastAuditDate).format('DD-MM-YYYY');
                }
                asset.isImport = asset?.isImport ? "Yes" : "No";

                // asset.status_class = asset.status == assetStatus?.available ? "status-available" : asset.status == assetStatus?.unavailable ? "status-unavailable" : asset.status == assetStatus?.assign ? "status-assigned" : "status-associate";
                // asset.status = asset.status == assetStatus?.available ? "Available" : asset.status == assetStatus?.available ? "Unavailble" : asset.status == assetStatus.assign ? "Assigned" : "Associate";

                const { status, status_class } = statusMapping[asset?.status] || { status: "-", status_class: "-" };

                asset.status = status;
                asset.status_class = status_class;
                asset.associate = asset?.associate?.map(asset => asset?.assetId).join(",<br>");

                // const itemsPerLine = 2; // Number of items per line
                // asset.associate = formatAssociate(asset.associate, itemsPerLine);

            });

            assets = [...assets, ...assets, ...assets]
            assets = [...assets, ...assets, ...assets]
            assets = [...assets, ...assets, ...assets]
            assets = [...assets, ...assets, ...assets]

            const htmlTemplatePath = path.join(__dirname, "..", "pdfTemplate.html");
            const htmlTemplate = fs.readFileSync(htmlTemplatePath, "utf8");

            const template = handlebars.compile(htmlTemplate);
            const html = template({ assets });

            await page.setContent(html, { waitUntil: 'networkidle0' });

            const fileName = `Asset_Data_${moment().format("DD-MM-YYYY_H-mm-ss-SSS")}.pdf`;
            const filePath = path.join(uploadDir, fileName);

            if (!fs.existsSync(filePath)) {
                await page.pdf({
                    path: filePath,
                    format: 'A3',
                    landscape: true,
                    printBackground: true,
                    margin: {
                        top: '2.75mm',
                        right: '3mm',
                        bottom: '2.75mm',
                        left: '1.15mm'
                    }
                });
            }
            await browser.close();
            await pdfQueue.add("pdfTask", { filePath }, { delay: 10000 });


            // setTimeout(() => {
            //     if (filePath) {
            //         fs.unlinkSync(filePath);
            //     }
            // }, 60000)
            return resolve({ status: HTTP?.SUCCESS, message: 'PDF create successfully', fileName, filePath });

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    })
}


module.exports = {
    addAssets,
    showAllAssets,
    showAssets,
    showAvailableAssets,
    updateAssets,
    deleteAssets,
    auditAssets,
    importAssetData,
    getPdfAsset,
    activityAsset,
    activityAssetExcel
}