const { HTTP, activityConstant, importDir } = require("../constant/constant");
const Asset = require("../models/assestsModel");
const Category = require("../models/categoryModel");
const User = require("../models/userModel");
const { addCategoryValidationSchema, updateCategoryValidationSchema } = require("../validation/category/categoryValidation");
const deleteValidationSchema = require("../validation/global/delete");
const showSingleValidationSchema = require("../validation/global/showSingle");
const { ObjectId } = require("mongodb");
const { activityLog } = require("../handler/activityLog");
const Activity = require("../models/activityModel");
const moment = require('moment');
const path = require("path")
const fs = require("fs");
const ExcelJS = require('exceljs');
const { excelQueue } = require("../redis/queue");

// * ----- Add Category -----
const addCategory = async (data, client) => {
    console.log(" ========== add category ========== ");
    return new Promise(async (resolve, reject) => {
        try {

            data.createdBy = client?._id?.toString();
            const { error, value } = addCategoryValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            const checkCategory = await Category.findOne({ name: value?.name, isActive: true, isDeleted: false });
            if (checkCategory) return reject({ status: HTTP?.CONFLICT, message: "Category already exisitng" })

            const category = {
                name: value?.name,
                description: value?.description,
                icon: value?.icon,
                color: value?.color,
                assetIdType: value?.assetIdType,
                createdBy: value?.createdBy,
                createdOn: value?.createdOn
            };

            // ? Conditionally include autoInc if assetIdType is 2
            if (value?.assetIdType == 2) category.autoInc = value?.autoInc;

            const categoryData = await Category(category).save();

            const activityData = {
                activityId: categoryData?._id,
                activityModel: activityConstant?.category,
                actionBy: client?._id,
                ipAddress: "0.0.0",
                activity: activityConstant?.activity?.create,
                logs: [{
                    old: {

                    },
                    new: {
                        ...categoryData
                    }
                }]
            }
            await activityLog(activityData)

            return resolve({ status: HTTP?.SUCCESS, message: "Category Add Success" })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}


// * ----- Show All Category -----
// ? lookup 
// const showAllCategory = async () => {
//     return new Promise(async (resolve, reject) => {

//         console.log(" ========== show all category ========== ");
//         try {


//             const categoryData = await Category.aggregate([
//                 {
//                     $match: {
//                         isActive: true,
//                         isDeleted: false
//                     }
//                 },
//                 {
//                     $lookup: {
//                         from: 'assetdatas', // 'assetdatas' is the name of assets collection
//                         localField: '_id', // Field in the 'categoryData' collection
//                         foreignField: 'category', // Field in the 'assetdatas' collection
//                         as: 'assets'
//                     }
//                 },
//                 {
//                     $lookup: {
//                         from: 'userdatas', // 'userdatas' is the name of users collection
//                         localField: 'createdBy', // Field in the 'categoryData' collection
//                         foreignField: '_id', // Field in the 'userdatas' collection
//                         as: 'createdBy'
//                     }
//                 },
//                 {
//                     $addFields: {
//                         createdBy: { $arrayElemAt: ['$createdBy', 0] }, // Extract the first element from the array
//                         createdOn: {
//                             $dateToString: {
//                                 format: "%Y-%m-%d %H:%M:%S", // Format the date 
//                                 date: "$createdOn"
//                             }
//                         }
//                     }
//                 },
//                 {
//                     $project: {
//                         _id: 1,
//                         name: 1,
//                         icon: 1,
//                         description: 1,
//                         createdBy: { _id: 1, name: 1 },
//                         createdOn: 1,
//                         assets: 1,
//                         assetCount: { $size: '$assets' } // Count the number of assets
//                     }
//                 }
//             ]);

//             if (!categoryData) return reject({ status: HTTP?.NOT_FOUND, message: 'Category not found' });

//             return resolve({ status: HTTP?.SUCCESS, message: "Here are all Category", categoryData })

//         } catch (error) {
//             console.log(error);
//             return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
//         }
//     })
// }

const showAllCategory = async () => {
    console.log(" ========== show all category ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const categories = await Category.find({ isActive: true, isDeleted: false });
            const users = await User.find({ isActive: true });
            const assets = await Asset.find({ isActive: true, isDeleted: false });

            const categoryData = [];

            for (const category of categories) {

                const categoryAssets = assets.filter(asset => asset?.category?.toString() == category?._id?.toString())
                const createdByUser = users.find(user => user?._id?.toString() == category?.createdBy?.toString())

                categoryData.push({
                    _id: category?._id,
                    name: category?.name,
                    icon: category?.icon,
                    description: category?.description,
                    createdBy: createdByUser ? { _id: createdByUser?._id, name: createdByUser?.name } : null,
                    assetCount: categoryAssets?.length
                });
            }


            return resolve({ status: HTTP?.SUCCESS, message: "Here are all Category", categoryData })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}


// * ----- Show Category -----
// ? lookup 
// const showCategory = async (data) => {
//     return new Promise(async (resolve, reject) => {

//         console.log(" ========== show category ========== ");
//         try {
//             const { error, value } = showSingleValidationSchema.validate(data);
//             if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });
//             const categoryData = await Category.aggregate([
//                 {
//                     $match: {
//                         _id: new ObjectId(value?.categoryId),
//                         isActive: true,
//                         isDeleted: false
//                     }
//                 },
//                 {
//                     $lookup: {
//                         from: 'assetdatas', // 'assetdatas' is the name of assets collection
//                         localField: '_id', // Field in the 'categoryData' collection
//                         foreignField: 'category', // Field in the 'assetdatas' collection
//                         as: 'assets'
//                     }
//                 },
//                 {
//                     $lookup: {
//                         from: 'userdatas', // 'userdatas' is the name of users collection
//                         localField: 'createdBy', // Field in the 'categoryData' collection
//                         foreignField: '_id', // Field in the 'userdatas' collection
//                         as: 'createdBy'
//                     }
//                 },
//                 {
//                     $addFields: {
//                         createdBy: { $arrayElemAt: ['$createdBy', 0] }, // Extract the first element from the array
//                         createdOn: {
//                             $dateToString: {
//                                 format: "%Y-%m-%d %H:%M:%S", // Format the date 
//                                 date: "$createdOn"
//                             }
//                         }
//                     }
//                 },
//                 {
//                     $project: {
//                         _id: 1,
//                         name: 1,
//                         icon: 1,
//                         description: 1,
//                         createdBy: { _id: 1, name: 1 },
//                         createdOn: 1,
//                         assets: 1,
//                         assetCount: { $size: '$assets' } // Count the number of assets
//                     }
//                 }
//             ]);
//             if (!categoryData) return reject({ status: HTTP?.NOT_FOUND, message: 'Category not found' });

//             return resolve({ status: HTTP?.SUCCESS, message: "Here is Category", categoryData })

//         } catch (error) {
//             console.log(error);
//             return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
//         }
//     })
// }

const showCategory = async (data) => {
    console.log(" ========== show category ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            const category = await Category.findOne({ _id: value?.categoryId, isActive: true, isDeleted: false });
            if (!category) return reject({ status: HTTP?.NOT_FOUND, message: "Category not found" });

            const categoryAssets = await Asset.find({ category: value?.categoryId, isActive: true, isDeleted: false })

            const categoryData = {
                category,
                assets: categoryAssets,
                assetCount: categoryAssets?.length
            }

            return resolve({ status: HTTP?.SUCCESS, message: "Here is Category", categoryData })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Fetch Category -----
const fetchCategory = async (data) => {
    console.log(" ========== fetch category ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            const categoryData = await Category.findOne({ _id: value?.categoryId, isActive: true, isDeleted: false })
            if (!categoryData) return reject({ status: HTTP?.NOT_FOUND, message: 'Category not found' });

            const catData = {};
            catData.assetIdType = categoryData?.assetIdType

            if (categoryData?.assetIdType == 1) {
                const lastAsset = await Asset.findOne({ category: value?.categoryId, isActive: true, isDeleted: false }).sort({ createdAt: -1 })
                catData.assetOldId = {
                    _id: lastAsset?._id,
                    assetId: lastAsset?.assetId
                }
            }
            else if (categoryData?.assetIdType == 2) {
                catData.assetId = categoryData?.autoInc?.prefix + categoryData?.autoInc?.number;
                catData.assetOldId = null;
            }
            return resolve({ status: HTTP?.SUCCESS, message: "Here is Category", catData })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Update Category -----
const updateCategory = async (data, client) => {
    console.log(" ========== update category ========== ");
    return new Promise(async (resolve, reject) => {
        try {

            // Validate the update data separately
            const { error, value } = updateCategoryValidationSchema.validate(data);

            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            // Fetch the existing category from the database
            const existingCategory = await Category.findOne({ _id: value?.categoryId, isActive: true, isDeleted: false });
            if (!existingCategory) return reject({ status: HTTP?.NOT_FOUND, message: 'Category not found' });

            const checkCategory = await Category.findOne({ name: value?.name, isActive: true, isDeleted: false });
            if (checkCategory) return reject({ status: HTTP?.CONFLICT, message: "Category already exisitng" })

            const mergedData = { ...existingCategory.toObject(), ...value };

            // Update the category with the merged data
            const updatedCategory = await Category.findByIdAndUpdate(value?.categoryId, mergedData, { new: true });

            const activityData = {
                activityId: existingCategory?._id,
                activityModel: activityConstant?.category,
                actionBy: client?._id,
                ipAddress: "0.0.0",
                activity: activityConstant?.activity?.update,
                logs: [{
                    old: {
                        ...existingCategory
                    },
                    new: {
                        ...updatedCategory
                    }
                }]
            }
            await activityLog(activityData)




            return resolve({ status: HTTP?.SUCCESS, message: 'Category updated successfully', category: updatedCategory });
        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Delete Category -----
const deleteCategory = async (data, client) => {
    console.log(" ========== delete category ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            data.deletedBy = client?._id?.toString();
            data.isDeleted = true;
            data.deletedOn = Date.now()
            const { error, value } = deleteValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            // Fetch the existing category from the database
            const existingCategory = await Category.findOne({ _id: value?.categoryId, isActive: true });
            if (!existingCategory) return reject({ status: HTTP?.NOT_FOUND, message: 'Category not found' });
            if (existingCategory?.isDeleted) return resolve({ status: HTTP?.SUCCESS, message: 'Category already deleted' });

            const existingCategoryWithAsset = await Asset.find({ category: value?.categoryId, isActive: true, isDeleted: false });
            if (existingCategoryWithAsset?.length) return resolve({ status: HTTP?.BAD_REQ, message: 'Category asigned asset' });

            // 1st way 
            // Update only the fields that have changed in the existingCategory
            Object.keys(value).forEach(key => {
                if (value[key] && existingCategory[key] != value[key]) {
                    existingCategory[key] = value[key];
                }
            });

            // Save the deleted category
            const deletedCategory = await existingCategory.save();
            return resolve({ status: HTTP?.SUCCESS, message: 'Category deleted successfully', category: deletedCategory });

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Activity Category -----
const activityCategory = async (data) => {
    console.log(" ========== Activity Category ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);

            if (error) return reject({ status: HTTP?.BAD_REQ, message: error?.details?.[0]?.message });

            const existingCategory = await Category.findOne({ _id: value?.categoryId, isActive: true, isDeleted: false });
            if (!existingCategory) return reject({ status: HTTP?.NOT_FOUND, message: 'Category not found' });

            const activityData = await Activity.find({ activityId: value?.categoryId }).sort({ "_id": -1 }).populate("actionBy", "name");

            return resolve({ status: HTTP?.SUCCESS, message: "Here are activity Category", activityData });

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    })
};

// * ----- Activity Category Excel -----
const activityCategoryExcel = async () => {
    console.log(" ========== Activity Category Excel ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const data = await Activity.find({ activityModel: activityConstant?.category }).populate("actionBy");

            const fileName = `Category_Activity_${moment().format("DD-MM-YYYY_H-mm-ss")}.xlsx`;
            const filePath = path.join(importDir, fileName);

            /* ------------------------------ without color ----------------------------- */
            if (!fs.existsSync(filePath)) {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Category Activity Logs');

                // Define the main headers
                worksheet.mergeCells('A1:D1'); // Activity
                worksheet.getCell('A1').value = 'Activity';
                worksheet.getCell('A1').alignment = { horizontal: 'center' };
                worksheet.getCell('A1').font = { bold: true };

                worksheet.mergeCells('E1:F1'); // Old Data
                worksheet.getCell('E1').value = 'Old Data';
                worksheet.getCell('E1').alignment = { horizontal: 'center' };
                worksheet.getCell('E1').font = { bold: true };

                worksheet.mergeCells('G1:H1'); // New Data
                worksheet.getCell('H1').value = 'New Data';
                worksheet.getCell('H1').alignment = { horizontal: 'center' };
                worksheet.getCell('H1').font = { bold: true };

                // Define the sub-headers in row 3
                worksheet.getRow(3).values = [
                    "Date", "Action By", "IP Address", " ",   // Activity sub-headers
                    'Name', 'Description', 'Icon', 'Color', 'Asset Id Type', ' ',  // Old Data headers
                    'Name', 'Description', 'Icon', 'Color', 'Asset Id Type',  // New Data headers
                ];

                worksheet.getRow(3).eachCell({ includeEmpty: true }, (cell) => {
                    cell.font = { bold: true };
                });

                // Set column widths (optional)
                worksheet.columns = [
                    { width: 25 }, // Column A - Date
                    { width: 20 }, // Column B - Action By
                    { width: 25 }, // Column C - IP Address
                    { width: 10 }, // Column D - Empty for Activity
                    { width: 20 }, // Column E - Old Data Name
                    { width: 30 }, // Column F - Old Data Description
                    { width: 20 }, // Column G - Old Data Icon
                    { width: 20 }, // Column H - Old Data Color
                    { width: 20 }, // Column I - Old Data Asset Id Type
                    { width: 10 }, // Column J - Empty for Old Data
                    { width: 20 }, // Column K - New Data Name
                    { width: 30 }, // Column L - New Data Description
                    { width: 20 }, // Column M - New Data Icon
                    { width: 20 }, // Column N - New Data Color
                    { width: 20 }, // Column O - New Data Asset Id Type
                ];


                let currentRow = 4; // Start from row 4 for data

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
                                worksheet.mergeCells(`E${currentRow}:J${currentRow}`);
                                worksheet.getCell(`E${currentRow}`).value = 'Created';
                                worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                                worksheet.getCell(`E${currentRow}`).font = { bold: true };

                                worksheet.getCell(`K${currentRow}`).value = newData.name || '';
                                worksheet.getCell(`L${currentRow}`).value = newData.description || '';
                                worksheet.getCell(`M${currentRow}`).value = newData.icon || '';
                                worksheet.getCell(`N${currentRow}`).value = newData.color || '';
                                worksheet.getCell(`O${currentRow}`).value = newData.assetIdType == 1 ? 'Manual' : "Auto Generated" || '';
                            } else {
                                // Add a row for regular data
                                worksheet.addRow([
                                    moment(activity.date).format('MMM DD, YYYY, hh:mm A') || '',
                                    activity.actionBy.name || '',
                                    activity.ipAddress || '',
                                    '',
                                    oldData.name || '',
                                    oldData.description || '',
                                    oldData.icon || '',
                                    oldData.color || '',
                                    oldData.assetIdType == 1 ? 'Manual' : "Auto Generated" || '',
                                    '',
                                    newData.name || '',
                                    newData.description || '',
                                    newData.icon || '',
                                    newData.color || '',
                                    newData.assetIdType == 1 ? 'Manual' : "Auto Generated" || '',
                                    '',
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

module.exports = {
    addCategory,
    showAllCategory,
    showCategory,
    fetchCategory,
    updateCategory,
    deleteCategory,
    activityCategory,
    activityCategoryExcel
}