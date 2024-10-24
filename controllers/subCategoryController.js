const { HTTP, activityConstant, importDir } = require("../constant/constant");
const { activityLog } = require("../handler/activityLog");
const Activity = require("../models/activityModel");
const SubCategory = require("../models/subCategoryModel");
const deleteValidationSchema = require("../validation/global/delete");
const showSingleValidationSchema = require("../validation/global/showSingle");
const moment = require("moment");
const { excelQueue } = require("../redis/queue");
const path = require("path");
const fs = require("fs");
const ExcelJS = require('exceljs');
const { addSubCategoryValidationSchema, updateSubCategoryValidationSchema } = require("../validation/subCategory/subCategoryValidation");
const Asset = require("../models/assestsModel");

// * ----- Add Sub Category -----
const addSubCategory = async (data, client) => {
    console.log(" ========== add sub category ========== ");
    return new Promise(async (resolve, reject) => {
        try {

            data.createdBy = client?._id?.toString();
            const { error, value } = addSubCategoryValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            const checkCategory = await SubCategory.findOne({ category: value?.category, name: value?.name, isActive: true, isDeleted: false });
            if (checkCategory) return reject({ status: HTTP?.CONFLICT, message: "Sub Category already exisitng" })

            const subCategory = {
                name: value?.name,
                description: value?.description,
                category: value?.category,
                createdBy: value?.createdBy,
                createdOn: value?.createdOn
            };

            const subCategoryData = await SubCategory(subCategory).save();

            const activityData = {
                activityId: subCategoryData?._id,
                activityModel: activityConstant?.subCategory,
                actionBy: client?._id,
                ipAddress: "0.0.0",
                activity: activityConstant?.activity?.create,
                logs: [{
                    old: {

                    },
                    new: {
                        ...subCategoryData
                    }
                }]
            }
            await activityLog(activityData)

            return resolve({ status: HTTP?.SUCCESS, message: "Sub Category Add Success" })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Fetch Sub Category -----
const fetchSubCategory = async (data) => {
    console.log(" ========== fetch sub category ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            const subCategoryData = await SubCategory.find({ category: value?.categoryId, isActive: true, isDeleted: false });
            // if (!subCategoryData) return reject({ status: HTTP?.NOT_FOUND, message: 'Sub Category not found' });

            return resolve({ status: HTTP?.SUCCESS, message: "Here is Sub Category", subCategoryData })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- SHow All Sub Category -----
const showAllSubCategory = async () => {
    console.log(" ========== show all sub category ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const subCategoryData = await SubCategory.find({});

            return resolve({ status: HTTP?.SUCCESS, message: "Here are all Sub Category", subCategoryData })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Show Sub Category -----
const showSubCategory = async (data) => {
    console.log(" ========== show sub category ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            const subCategoryData = await SubCategory.findOne({ _id: value?.subCategoryId, isActive: true, isDeleted: false }).populate("createdBy", "name").populate("deletedBy", "name");
            if (!subCategoryData) return reject({ status: HTTP?.NOT_FOUND, message: 'Sub Category not found' });

            return resolve({ status: HTTP?.SUCCESS, message: "Here is Sub Category", subCategoryData })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Update Sub Category -----
const updateSubCategory = async (data, client) => {
    console.log(" ========== update sub category ========== ");
    return new Promise(async (resolve, reject) => {

        try {

            // Validate the update data separately
            const { error, value } = updateSubCategoryValidationSchema.validate(data);

            if (error) {
                return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });
            }

            // Fetch the existing SubCategory from the database
            const existingSubCategory = await SubCategory.findOne({ _id: value?.subCategoryId, isActive: true, isDeleted: false });
            if (!existingSubCategory) return reject({ status: HTTP?.NOT_FOUND, message: 'Sub Category not found' });

            const mergedData = { ...existingSubCategory.toObject(), ...value };

            // Update the Sub Category with the merged data
            const updatedSubCategory = await SubCategory.findByIdAndUpdate(value?.subCategoryId, mergedData, { new: true });


            const activityData = {
                activityId: existingSubCategory?._id,
                activityModel: activityConstant?.subCategory,
                actionBy: client?._id,
                ipAddress: "0.0.0",
                activity: activityConstant?.activity?.update,
                logs: [{
                    old: {
                        ...existingSubCategory
                    },
                    new: {
                        ...updatedSubCategory
                    }
                }]
            }
            await activityLog(activityData)

            return resolve({ status: HTTP?.SUCCESS, message: 'Sub Category updated successfully', subCategory: updatedSubCategory });
        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Delete Sub Category -----
const deleteSubCategory = async (data, client) => {
    console.log(" ========== delete sub category ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            data.deletedBy = client?._id?.toString();
            data.isDeleted = true;
            data.deletedOn = Date.now();
            const { error, value } = deleteValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            // Fetch the existing sub category from the database
            const existingSubCategory = await SubCategory.findOne({ _id: value?.subCategoryId, isActive: true });
            if (!existingSubCategory) return reject({ status: HTTP?.NOT_FOUND, message: 'Sub Category not found' });
            if (existingSubCategory?.isDeleted) return resolve({ status: HTTP?.SUCCESS, message: 'Sub Category already deleted' });

            const existingSubCategoryWithAsset = await Asset.find({ subCategory: value?.subCategoryId, isActive: true, isDeleted: false });
            if (existingSubCategoryWithAsset?.length) return resolve({ status: HTTP?.SUCCESS, message: 'Sub Category assigned asset' });

            // Update only the fields that have changed in the existingSubCategory
            Object.keys(value).forEach(key => {
                if (value[key] && existingSubCategory[key] != value[key]) {
                    existingSubCategory[key] = value[key];
                }
            });

            // Save the deleted Sub Category
            const deletedSubCategory = await existingSubCategory.save();

            return resolve({ status: HTTP?.SUCCESS, message: 'Sub Category deleted successfully', subCategory: deletedSubCategory });

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Activity Sub Category -----
const activitySubCategory = async (data) => {
    console.log(" ========== Activity Sub Category ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);

            if (error) return reject({ status: HTTP?.BAD_REQ, message: error?.details?.[0]?.message });

            const existingCategory = await SubCategory.findOne({ _id: value?.subCategoryId, isActive: true, isDeleted: false });
            if (!existingCategory) return reject({ status: HTTP?.NOT_FOUND, message: 'Sub Category not found' });

            const activityData = await Activity.find({ activityId: value?.subCategoryId }).sort({ "_id": -1 }).populate("actionBy", "name");

            return resolve({ status: HTTP?.SUCCESS, message: "Here are activity Sub Category", activityData });

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    })
};

// * ----- Activity Sub Category Excel -----
const activitySubCategoryExcel = async () => {
    console.log(" ========== Activity Sub Category Excel ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const data = await Activity.find({ activityModel: activityConstant?.subCategory }).populate("actionBy");

            const fileName = `Sub_Category_Activity_${moment().format("DD-MM-YYYY_H-mm-ss")}.xlsx`;
            const filePath = path.join(importDir, fileName);

            /* ------------------------------ without color ----------------------------- */
            if (!fs.existsSync(filePath)) {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Sub Category Activity Logs');

                // Define the main headers
                worksheet.mergeCells('A1:D1'); // Activity
                worksheet.getCell('A1').value = 'Activity';
                worksheet.getCell('A1').alignment = { horizontal: 'center' };
                worksheet.getCell('A1').font = { bold: true };

                worksheet.mergeCells('E1:G1'); // Old Data
                worksheet.getCell('E1').value = 'Old Data';
                worksheet.getCell('E1').alignment = { horizontal: 'center' };
                worksheet.getCell('E1').font = { bold: true };

                worksheet.mergeCells('H1:J1'); // New Data
                worksheet.getCell('H1').value = 'New Data';
                worksheet.getCell('H1').alignment = { horizontal: 'center' };
                worksheet.getCell('H1').font = { bold: true };

                // Define the sub-headers in row 3
                worksheet.getRow(3).values = [
                    "Date", "Action By", "IP Address", " ",   // Activity sub-headers
                    'Name', "Description", ' ',  // Old Data headers
                    'Name', "Description"   // New Data headers
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
                    { width: 25 }, // Column F - Old Data Description
                    { width: 25 }, // Column G - Empty for Old Data
                    { width: 25 }, // Column I - New Data Name
                    { width: 25 }, // Column J - New Data Description
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
                                worksheet.mergeCells(`E${currentRow}:G${currentRow}`);
                                worksheet.getCell(`E${currentRow}`).value = 'Created';
                                worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                                worksheet.getCell(`E${currentRow}`).font = { bold: true };

                                worksheet.getCell(`H${currentRow}`).value = newData.name || '';
                                worksheet.getCell(`I${currentRow}`).value = newData.description || '';
                            } else {
                                // Add a row for regular data
                                worksheet.addRow([
                                    moment(activity.date).format('MMM DD, YYYY, hh:mm A') || '',
                                    activity.actionBy.name || '',
                                    activity.ipAddress || '',
                                    '',
                                    oldData.name || '',
                                    oldData.description || '',
                                    '',
                                    newData.name || '',
                                    newData.description || '',
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
    addSubCategory,
    fetchSubCategory,
    showSubCategory,
    showAllSubCategory,
    updateSubCategory,
    deleteSubCategory,
    activitySubCategory,
    activitySubCategoryExcel
}