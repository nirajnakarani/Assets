const { HTTP, activityConstant, importDir } = require("../constant/constant");
const Asset = require("../models/assestsModel");
const Condition = require("../models/conditionModel");
const { addConditionValidationSchema, updateConditionValidationSchema } = require("../validation/condition/conditionValidation");
const deleteValidationSchema = require("../validation/global/delete");
const showSingleValidationSchema = require("../validation/global/showSingle");
const { activityLog } = require("../handler/activityLog");
const Activity = require("../models/activityModel");
const moment = require("moment");
const { excelQueue } = require("../redis/queue");
const path = require("path");
const fs = require("fs");
const ExcelJS = require('exceljs');

// * ----- Default Condition -----
const defaultCondition = async () => {
    console.log(" ========== defualt condition ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const namesToCheck = ["Good", "Poor"];

            // Find conditions that match the names and are default
            const foundNames = (await Condition.find({
                name: { $in: namesToCheck },
                isDefault: true,
            })).map(con => con?.name);

            // Determine missing names and insert them if necessary
            const missingNames = namesToCheck.filter(name => !foundNames?.includes(name));

            if (!missingNames?.length) return resolve();

            await Condition.insertMany(missingNames?.map(name => ({ name, isDefault: true })));
            console.log('Inserted new Condition:', missingNames);
            return resolve();

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Add Condition -----
const addCondition = async (data, client) => {
    console.log(" ========== add condition ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            data.createdBy = client?._id?.toString();
            const { error, value } = addConditionValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message })
            const condition = {
                name: value?.name,
                description: value?.description,
                createdBy: value?.createdBy,
                createdOn: value?.createdOn
            }
            const conditionData = await Condition(condition).save();

            const activityData = {
                activityId: conditionData?._id,
                activityModel: activityConstant?.condition,
                actionBy: client?._id,
                ipAddress: "0.0.0",
                activity: activityConstant?.activity?.create,
                logs: [{
                    old: {

                    },
                    new: {
                        ...conditionData
                    }
                }]
            }
            await activityLog(activityData)
            return resolve({ status: HTTP?.SUCCESS, message: "Condition Add Successfully" })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Show All Condition -----
const showAllCondition = async () => {
    console.log(" ========== show all condition ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const conditionData = await Condition.find({});

            return resolve({ status: HTTP?.SUCCESS, message: "Here are all Condition", conditionData })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Show Condition -----
const showCondition = async (data) => {
    console.log(" ========== show condition ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            const conditionData = await Condition.findOne({ _id: value?.conditionId, isActive: true, isDeleted: false }).populate("createdBy", "name").populate("deletedBy", "name");
            if (!conditionData) return reject({ status: HTTP?.NOT_FOUND, message: 'Condition not found' });

            return resolve({ status: HTTP?.SUCCESS, message: "Here is Condition", conditionData })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Update Condition -----
const updateCondition = async (data, client) => {
    console.log(" ========== update condition ========== ");
    return new Promise(async (resolve, reject) => {

        try {

            // Validate the update data separately
            const { error, value } = updateConditionValidationSchema.validate(data);

            if (error) {
                return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });
            }

            // Fetch the existing condition from the database
            const existingCondition = await Condition.findOne({ _id: value?.conditionId, isActive: true, isDeleted: false, isDefault: false });
            if (!existingCondition) return reject({ status: HTTP?.NOT_FOUND, message: 'Condition not found' });


            const mergedData = { ...existingCondition.toObject(), ...value };

            // Update the condition with the merged data
            const updatedCondition = await Condition.findByIdAndUpdate(value?.conditionId, mergedData, { new: true });

            const activityData = {
                activityId: existingCondition?._id,
                activityModel: activityConstant?.condition,
                actionBy: client?._id,
                ipAddress: "0.0.0",
                activity: activityConstant?.activity?.update,
                logs: [{
                    old: {
                        ...existingCondition
                    },
                    new: {
                        ...updatedCondition
                    }
                }]
            }
            await activityLog(activityData)

            return resolve({ status: HTTP?.SUCCESS, message: 'Condition updated successfully', condition: updatedCondition });
        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Delete Condition -----
const deleteCondition = async (data, client) => {
    console.log(" ========== delete condition ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            data.deletedBy = client?._id?.toString();
            data.isDeleted = true;
            data.deletedOn = Date.now();
            const { error, value } = deleteValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            // Fetch the existing condtion from the database
            const existingCondition = await Condition.findOne({ _id: value?.conditionId, isActive: true });
            if (!existingCondition) return reject({ status: HTTP?.NOT_FOUND, message: 'Condition not found' });
            if (existingCondition?.isDeleted) return resolve({ status: HTTP?.SUCCESS, message: 'Condition already deleted' });

            const existingConditionWithCondition = await Asset.find({ condition: value?.conditionId, isActive: true, isDeleted: false });
            if (existingConditionWithCondition?.length) return resolve({ status: HTTP?.BAD_REQ, message: 'Condition assigned asset' });

            // Update only the fields that have changed in the existingCondition
            Object.keys(value).forEach(key => {
                if (value[key] && existingCondition[key] != value[key]) {
                    existingCondition[key] = value[key];
                }
            });

            // Save the deleted Condition
            const deletedCondition = await existingCondition.save();

            return resolve({ status: HTTP?.SUCCESS, message: 'Condition deleted successfully', condition: deletedCondition });

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Activity Condition -----
const activityCondition = async (data) => {
    console.log(" ========== Activity Condition ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);

            if (error) return reject({ status: HTTP?.BAD_REQ, message: error?.details?.[0]?.message });

            const existingCondition = await Condition.findOne({ _id: value?.conditionId, isActive: true, isDeleted: false });
            if (!existingCondition) return reject({ status: HTTP?.NOT_FOUND, message: 'Condition not found' });

            const activityData = await Activity.find({ activityId: value?.conditionId }).sort({ "_id": -1 }).populate("actionBy", "name");

            return resolve({ status: HTTP?.SUCCESS, message: "Here are activity Condition", activityData });

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    })
};

// * ----- Activity Condition Excel -----
const activityConditionExcel = async () => {
    console.log(" ========== Activity Condition Excel ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const data = await Activity.find({ activityModel: activityConstant?.condition }).populate("actionBy");

            const fileName = `Condition_Activity_${moment().format("DD-MM-YYYY_H-mm-ss")}.xlsx`;
            const filePath = path.join(importDir, fileName);

            /* ------------------------------ without color ----------------------------- */
            if (!fs.existsSync(filePath)) {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Condition Activity Logs');

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
                    'Name', ' ',  // Old Data headers
                    'Name'   // New Data headers
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
                    { width: 25 }, // Column F - Empty for Old Data
                    { width: 25 }, // Column G - New Data Name
                    { width: 25 }, // Column H - Empty for New Data
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

                                worksheet.getCell(`G${currentRow}`).value = newData.name || '';
                                worksheet.getCell(`H${currentRow}`).value = '';
                            } else {
                                // Add a row for regular data
                                worksheet.addRow([
                                    moment(activity.date).format('MMM DD, YYYY, hh:mm A') || '',
                                    activity.actionBy.name || '',
                                    activity.ipAddress || '',
                                    '',
                                    oldData.name || '',
                                    '',
                                    newData.name || '',
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
    defaultCondition,
    addCondition,
    showAllCondition,
    showCondition,
    updateCondition,
    deleteCondition,
    activityCondition,
    activityConditionExcel
}