const { HTTP, activityConstant, importDir } = require("../constant/constant");
const Asset = require("../models/assestsModel");
const Location = require("../models/locationModel");
const deleteValidationSchema = require("../validation/global/delete");
const showSingleValidationSchema = require("../validation/global/showSingle");
const { addLocationValidationSchema, updateLocationValidationSchema } = require("../validation/location/locationValidation");
const { activityLog } = require("../handler/activityLog");
const Activity = require("../models/activityModel");
const moment = require("moment");
const { excelQueue } = require("../redis/queue");
const path = require("path");
const fs = require("fs");
const ExcelJS = require('exceljs');

// * ----- Add Location -----
const addLocation = async (data, client) => {
    console.log(" ========== add l ocation ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            data.createdBy = client?._id?.toString();
            const { error, value } = addLocationValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message })
            const location = {
                name: value?.name,
                createdBy: value?.createdBy,
                createdOn: value?.createdOn
            }
            const locationData = await Location(location).save();
            const activityData = {
                activityId: locationData?._id,
                activityModel: activityConstant?.location,
                actionBy: client?._id,
                ipAddress: "0.0.0",
                activity: activityConstant?.activity?.create,
                logs: [{
                    old: {

                    },
                    new: {
                        ...locationData
                    }
                }]
            }
            await activityLog(activityData)
            return resolve({ status: HTTP?.SUCCESS, message: "Location Add Successfully" })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Show All Location -----
const showAllLocation = async () => {
    console.log(" ========== show all location ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const locationData = await Location.find({});

            return resolve({ status: HTTP?.SUCCESS, message: "Here are all Location", locationData })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Show Location -----
const showLocation = async (data) => {
    console.log(" ========== show location ========== ");
    return new Promise(async (resolve, reject) => {

        try {
            const { error, value } = showSingleValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            const locationData = await Location.findOne({ _id: value?.locationId, isActive: true, isDeleted: false }).populate("createdBy", "name").populate("deletedBy", "name");
            if (!locationData) return reject({ status: HTTP?.NOT_FOUND, message: 'Location not found' });

            return resolve({ status: HTTP?.SUCCESS, message: "Here is Location", locationData })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Update Location -----
const updateLocation = async (data, client) => {
    console.log(" ========== update location ========== ");
    return new Promise(async (resolve, reject) => {

        try {

            // Validate the update data separately
            const { error, value } = updateLocationValidationSchema.validate(data);

            if (error) {
                return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });
            }

            // Fetch the existing location from the database
            const existingLocation = await Location.findOne({ _id: value?.locationId, isActive: true, isDeleted: false });
            if (!existingLocation) return reject({ status: HTTP?.NOT_FOUND, message: 'Location not found' });


            const mergedData = { ...existingLocation.toObject(), ...value };

            // Update the Location with the merged data
            const updatedLocation = await Location.findByIdAndUpdate(value?.locationId, mergedData, { new: true });

            const activityData = {
                activityId: existingLocation?._id,
                activityModel: activityConstant?.location,
                actionBy: client?._id,
                ipAddress: "0.0.0",
                activity: activityConstant?.activity?.update,
                logs: [{
                    old: {
                        ...existingLocation
                    },
                    new: {
                        ...updateLocation
                    }
                }]
            }
            await activityLog(activityData)

            return resolve({ status: HTTP?.SUCCESS, message: 'Location updated successfully', location: updatedLocation });
        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Delete Location -----
const deleteLocation = async (data, client) => {
    console.log(" ========== delete location ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            data.deletedBy = client?._id?.toString();
            data.isDeleted = true;
            data.deletedOn = Date.now();
            const { error, value } = deleteValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            // Fetch the existing location from the database
            const existingLocation = await Location.findOne({ _id: value?.locationId, isActive: true });
            if (!existingLocation) return reject({ status: HTTP?.NOT_FOUND, message: 'Location not found' });
            if (existingLocation?.isDeleted) return resolve({ status: HTTP?.SUCCESS, message: 'Location already deleted' });

            const existingLocationWithAsset = await Asset.find({ location: value?.locationId, isActive: true, isDeleted: false });
            if (existingLocationWithAsset?.length) return resolve({ status: HTTP?.SUCCESS, message: 'Location assigned asset' });

            // Update only the fields that have changed in the existingLocation
            Object.keys(value).forEach(key => {
                if (value[key] && existingLocation[key] != value[key]) {
                    existingLocation[key] = value[key];
                }
            });

            // Save the deleted Location
            const deletedLocation = await existingLocation.save();

            return resolve({ status: HTTP?.SUCCESS, message: 'Location deleted successfully', location: deletedLocation });

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Activity Location -----
const activityLocation = async (data) => {
    console.log(" ========== Activity Location ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);

            if (error) return reject({ status: HTTP?.BAD_REQ, message: error?.details?.[0]?.message });

            const existingLocation = await Location.findOne({ _id: value?.locationId, isActive: true, isDeleted: false });
            if (!existingLocation) return reject({ status: HTTP?.NOT_FOUND, message: 'Location not found' });

            const activityData = await Activity.find({ activityId: value?.locationId }).sort({ "_id": -1 }).populate("actionBy", "name");

            return resolve({ status: HTTP?.SUCCESS, message: "Here are activity Location", activityData });

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    })
};

// * ----- Activity Location Excel -----
const activityLocationExcel = async () => {
    console.log(" ========== Activity Location Excel ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const data = await Activity.find({ activityModel: activityConstant?.location }).populate("actionBy");

            const fileName = `Location_Activity_${moment().format("DD-MM-YYYY_H-mm-ss")}.xlsx`;
            const filePath = path.join(importDir, fileName);

            /* ------------------------------ without color ----------------------------- */
            if (!fs.existsSync(filePath)) {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Location Activity Logs');

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
    addLocation,
    showAllLocation,
    showLocation,
    updateLocation,
    deleteLocation,
    activityLocation,
    activityLocationExcel
}