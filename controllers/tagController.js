const { HTTP, activityConstant, importDir } = require("../constant/constant");
const { activityLog } = require("../handler/activityLog");
const Activity = require("../models/activityModel");
const Asset = require("../models/assestsModel");
const Tag = require("../models/tagModel");
const deleteValidationSchema = require("../validation/global/delete");
const showSingleValidationSchema = require("../validation/global/showSingle");
const { addTagValidationSchema, updateTagValidationSchema } = require("../validation/tag/tagValidation");

const moment = require("moment");
const { excelQueue } = require("../redis/queue");
const path = require("path");
const fs = require("fs");
const ExcelJS = require('exceljs');

// * ----- Add Tag -----
const addTag = async (data, client) => {
    console.log(" ========== add tag ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            data.createdBy = client?._id?.toString();
            const { error, value } = addTagValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message })
            const tag = {
                name: value?.name,
                color: value?.color,
                description: value?.description,
                createdBy: value?.createdBy,
                createdOn: value?.createdOn
            }
            const tagData = await Tag(tag).save();
            const activityData = {
                activityId: tagData?._id,
                activityModel: activityConstant?.tag,
                actionBy: client?._id,
                ipAddress: "0.0.0",
                activity: activityConstant?.activity?.create,
                logs: [{
                    old: {

                    },
                    new: {
                        ...tagData
                    }
                }]
            }
            await activityLog(activityData)
            return resolve({ status: HTTP?.SUCCESS, message: "Tag Add Successfully" })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Show All Tag -----
const showAllTag = async () => {
    console.log(" ========== show all tag ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const tagData = await Tag.find({});

            return resolve({ status: HTTP?.SUCCESS, message: "Here are all Tag", tagData })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Show Tag -----
const showTag = async (data) => {
    console.log(" ========== show tag ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            const tagData = await Tag.findOne({ _id: value?.tagId, isActive: true, isDeleted: false }).populate("createdBy", "name").populate("deletedBy", "name");
            if (!tagData) return reject({ status: HTTP?.NOT_FOUND, message: 'Tag not found' });

            return resolve({ status: HTTP?.SUCCESS, message: "Here is Tag", tagData })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Update Tag -----
const updateTag = async (data, client) => {
    console.log(" ========== update tag ========== ");
    return new Promise(async (resolve, reject) => {

        try {

            // Validate the update data separately
            const { error, value } = updateTagValidationSchema.validate(data);

            if (error) {
                return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });
            }

            // Fetch the existing tag from the database
            const existingTag = await Tag.findOne({ _id: value?.tagId, isActive: true, isDeleted: false });
            if (!existingTag) return reject({ status: HTTP?.NOT_FOUND, message: 'Tag not found' });

            const mergedData = { ...existingTag.toObject(), ...value };

            // Update the Tag with the merged data
            const updatedTag = await Tag.findByIdAndUpdate(value?.tagId, mergedData, { new: true });


            const activityData = {
                activityId: existingTag?._id,
                activityModel: activityConstant?.tag,
                actionBy: client?._id,
                ipAddress: "0.0.0",
                activity: activityConstant?.activity?.update,
                logs: [{
                    old: {
                        ...existingTag
                    },
                    new: {
                        ...updatedTag
                    }
                }]
            }
            await activityLog(activityData)

            return resolve({ status: HTTP?.SUCCESS, message: 'Tag updated successfully', tag: updatedTag });
        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Delete Tag -----
const deleteTag = async (data, client) => {
    console.log(" ========== delete tag ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            data.deletedBy = client?._id?.toString();
            data.isDeleted = true;
            data.deletedOn = Date.now();
            const { error, value } = deleteValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            // Fetch the existing tag from the database
            const existingTag = await Tag.findOne({ _id: value?.tagId, isActive: true });
            if (!existingTag) return reject({ status: HTTP?.NOT_FOUND, message: 'Tag not found' });
            if (existingTag?.isDeleted) return resolve({ status: HTTP?.SUCCESS, message: 'Tag already deleted' });

            const existingTagWithAsset = await Asset.find({ tag: value?.tagId, isActive: true, isDeleted: false });
            if (existingTagWithAsset?.length) return resolve({ status: HTTP?.BAD_REQ, message: 'Tag assigned asset' });

            // Update only the fields that have changed in the existingTag
            Object.keys(value).forEach(key => {
                if (value[key] && existingTag[key] != value[key]) {
                    existingTag[key] = value[key];
                }
            });

            // Save the deleted Tag
            const deletedTag = await existingTag.save();

            return resolve({ status: HTTP?.SUCCESS, message: 'Tag deleted successfully', tag: deletedTag });

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Activity Tag -----
const activityTag = async (data) => {
    console.log(" ========== Activity Tag ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);

            if (error) return reject({ status: HTTP?.BAD_REQ, message: error?.details?.[0]?.message });

            const existingTag = await Tag.findOne({ _id: value?.tagId, isActive: true, isDeleted: false });
            if (!existingTag) return reject({ status: HTTP?.NOT_FOUND, message: 'Tag not found' });

            const activityData = await Activity.find({ activityId: value?.tagId }).sort({ "_id": -1 }).populate("actionBy", "name");

            return resolve({ status: HTTP?.SUCCESS, message: "Here are activity Tag", activityData });

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    })
};


// * ----- Activity Tag Excel -----
const activityTagExcel = async () => {
    console.log(" ========== Activity Tag Excel ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const data = await Activity.find({ activityModel: activityConstant?.tag }).populate("actionBy");

            const fileName = `Tag_Activity_${moment().format("DD-MM-YYYY_H-mm-ss")}.xlsx`;
            const filePath = path.join(importDir, fileName);

            /* ------------------------------ without color ----------------------------- */
            if (!fs.existsSync(filePath)) {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Tag Activity Logs');

                // Define the main headers
                worksheet.mergeCells('A1:D1'); // Activity
                worksheet.getCell('A1').value = 'Activity';
                worksheet.getCell('A1').alignment = { horizontal: 'center' };
                worksheet.getCell('A1').font = { bold: true };

                worksheet.mergeCells('E1:G1'); // Old Data
                worksheet.getCell('E1').value = 'Old Data';
                worksheet.getCell('E1').alignment = { horizontal: 'center' };
                worksheet.getCell('E1').font = { bold: true };

                worksheet.mergeCells('H1:I1'); // New Data
                worksheet.getCell('H1').value = 'New Data';
                worksheet.getCell('H1').alignment = { horizontal: 'center' };
                worksheet.getCell('H1').font = { bold: true };

                // Define the sub-headers in row 3
                worksheet.getRow(3).values = [
                    "Date", "Action By", "IP Address", " ",   // Activity sub-headers
                    'Name', 'Color', ' ',  // Old Data headers
                    'Name', 'Color'   // New Data headers
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
                    { width: 25 }, // Column F - Old Data Color
                    { width: 25 }, // Column G - Empty for Old Data
                    { width: 25 }, // Column H - New Data Name
                    { width: 30 }, // Column I - New Data Color
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
                                worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
                                worksheet.getCell(`E${currentRow}`).value = 'Created';
                                worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                                worksheet.getCell(`E${currentRow}`).font = { bold: true };

                                worksheet.getCell(`G${currentRow}`).value = '';
                                worksheet.getCell(`H${currentRow}`).value = newData.name || '';
                                worksheet.getCell(`I${currentRow}`).value = newData.color || '';
                            } else {
                                // Add a row for regular data
                                worksheet.addRow([
                                    moment(activity.date).format('MMM DD, YYYY, hh:mm A') || '',
                                    activity.actionBy.name || '',
                                    activity.ipAddress || '',
                                    '',
                                    oldData.name || '',
                                    oldData.color || '',
                                    '',
                                    newData.name || '',
                                    newData.color || ''
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
    addTag,
    showAllTag,
    showTag,
    updateTag,
    deleteTag,
    activityTag,
    activityTagExcel
}