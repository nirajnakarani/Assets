const { HTTP, activityConstant, importDir } = require("../constant/constant");
const Asset = require("../models/assestsModel");
const Vendor = require("../models/vendorModel");
const deleteValidationSchema = require("../validation/global/delete");
const showSingleValidationSchema = require("../validation/global/showSingle");
const { addVendorValidationSchema, updateVendorValidationSchema } = require("../validation/vendor/vendorValidation");
const { activityLog } = require("../handler/activityLog");
const Activity = require("../models/activityModel");
const moment = require("moment");
const { excelQueue } = require("../redis/queue");
const path = require("path");
const fs = require("fs");
const ExcelJS = require('exceljs');


// * ----- Add Vendor -----
const addVendor = async (data, client) => {
    console.log(" ========== add vendor ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            data.createdBy = client?._id?.toString();
            const { error, value } = addVendorValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message })
            const vendor = {
                name: value?.name,
                email: value?.email,
                contactNumber: value?.contactNumber,
                alternateNumber: value?.alternateNumber,
                contactPersonName: value?.contactPersonName,
                address: value?.address,
                createdBy: value?.createdBy,
                createdOn: value?.createdOn
            }
            const vendorData = await Vendor(vendor).save();
            const activityData = {
                activityId: vendorData?._id,
                activityModel: activityConstant?.vendor,
                actionBy: client?._id,
                ipAddress: "0.0.0",
                activity: activityConstant?.activity?.create,
                logs: [{
                    old: {},
                    new: {
                        ...vendorData
                    }
                }]
            }
            await activityLog(activityData)
            return resolve({ status: HTTP?.SUCCESS, message: "Vendor Add Successfully" })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Show All Vendor -----
const showAllVendor = async () => {
    console.log(" ========== show all vendor ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const vendorData = await Vendor.find({});

            return resolve({ status: HTTP?.SUCCESS, message: "Here are all Vendors", vendorData })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Show Vendor -----
const showVendor = async (data) => {
    console.log(" ========== show vendor ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            const vendorData = await Vendor.findOne({ _id: value?.vendorId, isActive: true, isDeleted: false }).populate("createdBy", "name").populate("deletedBy", "name");
            if (!vendorData) return reject({ status: HTTP?.NOT_FOUND, message: 'Vendor not found' });

            return resolve({ status: HTTP?.SUCCESS, message: "Here is Vendor", vendorData })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Update Vendor -----
const updateVendor = async (data, client) => {
    console.log(" ========== update vendor ========== ");
    return new Promise(async (resolve, reject) => {

        try {

            // Validate the update data separately
            const { error, value } = updateVendorValidationSchema.validate(data);

            if (error) {
                return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });
            }

            // Fetch the existing vendor from the database
            const existingVendor = await Vendor.findOne({ _id: value?.vendorId, isActive: true, isDeleted: false });
            if (!existingVendor) return reject({ status: HTTP?.NOT_FOUND, message: 'Vendor not found' });


            const mergedData = { ...existingVendor.toObject(), ...value };

            // Update the Vendor with the merged data
            const updatedVendor = await Vendor.findByIdAndUpdate(value?.vendorId, mergedData, { new: true });

            // Save the updated Vendor
            const activityData = {
                activityId: existingVendor?._id,
                activityModel: activityConstant?.vendor,
                actionBy: client?._id,
                ipAddress: "0.0.0",
                activity: activityConstant?.activity?.update,
                logs: [{
                    old: {
                        ...existingVendor
                    },
                    new: {
                        ...updatedVendor
                    }
                }]
            }
            await activityLog(activityData)

            return resolve({ status: HTTP?.SUCCESS, message: 'Vendor updated successfully', vendor: updatedVendor });
        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Delete Vendor -----
const deleteVendor = async (data, client) => {
    console.log(" ========== delete vendor ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            data.deletedBy = client?._id?.toString();
            data.isDeleted = true;
            data.deletedOn = Date.now();

            const { error, value } = deleteValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            // Fetch the existing vendor from the database
            const existingVendor = await Vendor.findOne({ _id: value?.vendorId, isActive: true });
            if (!existingVendor) return reject({ status: HTTP?.NOT_FOUND, message: 'Vendor not found' });
            if (existingVendor?.isDeleted) return resolve({ status: HTTP?.SUCCESS, message: 'Vendor already deleted' });

            const existingVendorWithAsset = await Asset.find({ vendor: value?.vendorId, isActive: true, isDeleted: false });
            if (existingVendorWithAsset?.length) return resolve({ status: HTTP?.BAD_REQ, message: 'Vendor assigned asset' });

            // Update only the fields that have changed in the existingVendor
            Object.keys(value).forEach(key => {
                if (value[key] && existingVendor[key] != value[key]) {
                    existingVendor[key] = value[key];
                }
            });

            // Save the deleted vendor
            const deletedVendor = await existingVendor.save();

            return resolve({ status: HTTP?.SUCCESS, message: 'Vendor deleted successfully', vendor: deletedVendor });

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Activity Vendor -----
const activityVendor = async (data) => {
    console.log(" ========== Activity Vendor ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);

            if (error) return reject({ status: HTTP?.BAD_REQ, message: error?.details?.[0]?.message });

            const existingVendor = await Vendor.findOne({ _id: value?.vendorId, isActive: true, isDeleted: false });
            if (!existingVendor) return reject({ status: HTTP?.NOT_FOUND, message: 'Vendor not found' });

            const activityData = await Activity.find({ activityId: value?.vendorId }).sort({ "_id": -1 }).populate("actionBy", "name");

            return resolve({ status: HTTP?.SUCCESS, message: "Here are activity Vendor", activityData });

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    })
};

// * ----- Activity Vendor Excel -----
const activityVendorExcel = async () => {
    console.log(" ========== Activity Vendor Excel ========== ");
    return new Promise(async (resolve, reject) => {

        try {

            // const data = await Activity.find({ activityModel: activityConstant?.vendor });

            // const fileName = `Vendor_Activity_${moment().format("DD-MM-YYYY_H-mm-ss")}.xlsx`;
            // const filePath = path.join(importDir, fileName);

            // if (!fs.existsSync(filePath)) {
            //     // Create a new workbook and add a worksheet for data
            //     const workbook = new ExcelJS.Workbook();
            //     const worksheet = workbook.addWorksheet('Vendor Activity Logs');

            //     // Define the columns
            //     worksheet.columns = [
            //         { header: 'Vendor Name', key: "name", width: 20 },
            //         { header: 'Email', key: "email", width: 25 },
            //         { header: 'Contact Number', key: "contactNumber", width: 25 },
            //         { header: 'Contact Person Name', key: "contactPersonName", width: 30 },
            //         { header: 'Address', key: "address", width: 30 },
            //         { header: 'Created By', key: "createdBy", width: 30 },
            //         { header: 'Created On (DD-MM-YYYY)', key: "createdOn", width: 25 },
            //         { header: 'Change Type', key: "changeType", width: 15 },
            //     ];

            //     // Iterate through the activity logs and add rows
            //     if (data?.length > 0) {
            //         data.forEach((activity) => {
            //             activity.logs.forEach((log) => {
            //                 const changeType = log?.old ? 'Modified' : 'Created';

            //                 // Old Data Row
            //                 if (log?.old) {
            //                     worksheet.addRow({
            //                         name: log?.old?.name,
            //                         email: log?.old?.email,
            //                         contactNumber: log?.old?.contactNumber,
            //                         contactPersonName: log?.old?.contactPersonName,
            //                         address: log?.old?.address,
            //                         createdBy: log?.old?.createdBy,
            //                         createdOn: moment(log?.old?.createdOn?.$date).format("DD-MM-YYYY"),
            //                         changeType: 'Old'
            //                     });
            //                 }

            //                 // New Data Row
            //                 worksheet.addRow({
            //                     name: log?.new?.name,
            //                     email: log?.new?.email,
            //                     contactNumber: log?.new?.contactNumber,
            //                     contactPersonName: log?.new?.contactPersonName,
            //                     address: log?.new?.address,
            //                     createdBy: log?.new?.createdBy,
            //                     createdOn: moment(log?.new?.createdOn?.$date).format("DD-MM-YYYY"),
            //                     changeType: changeType === 'Created' ? 'New' : 'Modified'
            //                 });
            //             });
            //         });
            //     }

            //     await workbook.xlsx.writeFile(filePath);
            // }



            const data = await Activity.find({ activityModel: activityConstant?.vendor }).populate("actionBy");

            const fileName = `Vendor_Activity_${moment().format("DD-MM-YYYY_H-mm-ss")}.xlsx`;
            const filePath = path.join(importDir, fileName);


            /* ------------------------ side by side comparision ------------------------ */

            // if (!fs.existsSync(filePath)) {
            //     const workbook = new ExcelJS.Workbook();
            //     const worksheet = workbook.addWorksheet('Vendor Activity Logs');

            //     worksheet.mergeCells('A1:E1'); // Old Data
            //     worksheet.getCell('A1').value = 'Old Data';
            //     worksheet.getCell('A1').alignment = { horizontal: 'center' };
            //     worksheet.getCell('A1').font = { bold: true }; // Make the text bold

            //     worksheet.mergeCells('F1:J1'); // New Data
            //     worksheet.getCell('F1').value = 'New Data';
            //     worksheet.getCell('F1').alignment = { horizontal: 'center' };
            //     worksheet.getCell('F1').font = { bold: true }; // Make the text bold

            //     // Define the sub-headers
            //     worksheet.getRow(3).values = [
            //         'Name', 'Email', 'Contact Number', 'Contact Person Name', 'Address',  // Old Data headers
            //         'Name', 'Email', 'Contact Number', 'Contact Person Name', 'Address'   // New Data headers
            //     ];

            //     // Set column widths (optional)
            //     worksheet.columns = [
            //         { width: 20 }, // Column A
            //         { width: 25 }, // Column B
            //         { width: 25 }, // Column C
            //         { width: 30 }, // Column D
            //         { width: 30 }, // Column E
            //         { width: 20 }, // Column F
            //         { width: 25 }, // Column G
            //         { width: 25 }, // Column H
            //         { width: 30 }, // Column I
            //         { width: 30 }  // Column J
            //     ];

            //     // Add data to the worksheet
            //     if (data?.length > 0) {
            //         data.forEach((activity) => {
            //             activity.logs.forEach((log) => {
            //                 const oldData = log.old || {};
            //                 const newData = log.new || {};

            //                 worksheet.addRow([
            //                     oldData.name || '',
            //                     oldData.email || '',
            //                     oldData.contactNumber || '',
            //                     oldData.contactPersonName || '',
            //                     oldData.address || '',
            //                     newData.name || '',
            //                     newData.email || '',
            //                     newData.contactNumber || '',
            //                     newData.contactPersonName || '',
            //                     newData.address || ''
            //                 ]);
            //             });
            //         });
            //     }



            //     // Write the file
            //     await workbook.xlsx.writeFile(filePath);

            // }


            /* ------------------------------ without color ----------------------------- */
            if (!fs.existsSync(filePath)) {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Vendor Activity Logs');

                // Define the main headers
                worksheet.mergeCells('A1:D1'); // Activity
                worksheet.getCell('A1').value = 'Activity';
                worksheet.getCell('A1').alignment = { horizontal: 'center' };
                worksheet.getCell('A1').font = { bold: true };

                worksheet.mergeCells('E1:I1'); // Old Data
                worksheet.getCell('E1').value = 'Old Data';
                worksheet.getCell('E1').alignment = { horizontal: 'center' };
                worksheet.getCell('E1').font = { bold: true };

                worksheet.mergeCells('K1:O1'); // New Data
                worksheet.getCell('K1').value = 'New Data';
                worksheet.getCell('K1').alignment = { horizontal: 'center' };
                worksheet.getCell('K1').font = { bold: true };

                // Define the sub-headers in row 3
                worksheet.getRow(3).values = [
                    "Date", "Action By", "IP Address", " ",   // Activity sub-headers
                    'Name', 'Email', 'Contact Number', 'Contact Person Name', 'Address', ' ',  // Old Data headers
                    'Name', 'Email', 'Contact Number', 'Contact Person Name', 'Address'   // New Data headers
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
                    { width: 25 }, // Column F - Old Data Email
                    { width: 25 }, // Column G - Old Data Contact Number
                    { width: 30 }, // Column H - Old Data Contact Person Name
                    { width: 30 }, // Column I - Old Data Address
                    { width: 10 }, // Column J - Empty for Old Data
                    { width: 20 }, // Column K - New Data Name
                    { width: 25 }, // Column L - New Data Email
                    { width: 25 }, // Column M - New Data Contact Number
                    { width: 30 }, // Column N - New Data Contact Person Name
                    { width: 30 }  // Column O - New Data Address
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
                                worksheet.mergeCells(`E${currentRow}:I${currentRow}`);
                                worksheet.getCell(`E${currentRow}`).value = 'Created';
                                worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                                worksheet.getCell(`E${currentRow}`).font = { bold: true };

                                worksheet.getCell(`J${currentRow}`).value = '';
                                worksheet.getCell(`K${currentRow}`).value = newData.name || '';
                                worksheet.getCell(`L${currentRow}`).value = newData.email || '';
                                worksheet.getCell(`M${currentRow}`).value = Number(newData.contactNumber) || '';
                                worksheet.getCell(`N${currentRow}`).value = newData.contactPersonName || '';
                                worksheet.getCell(`O${currentRow}`).value = newData.address || '';

                            } else {
                                // Add a row for regular data
                                worksheet.addRow([
                                    moment(activity.date).format('MMM DD, YYYY, hh:mm A') || '',
                                    activity.actionBy.name || '',
                                    activity.ipAddress || '',
                                    '',
                                    oldData.name || '',
                                    oldData.email || '',
                                    Number(oldData.contactNumber) || '',
                                    oldData.contactPersonName || '',
                                    oldData.address || '',
                                    '',
                                    newData.name || '',
                                    newData.email || '',
                                    Number(newData.contactNumber) || '',
                                    newData.contactPersonName || '',
                                    newData.address || ''
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


            // with color 
            // if (!fs.existsSync(filePath)) {
            //     const workbook = new ExcelJS.Workbook();
            //     const worksheet = workbook.addWorksheet('Vendor Activity Logs');

            //     // Define the main headers
            //     worksheet.mergeCells('A1:D1'); // Activity
            //     worksheet.getCell('A1').value = 'Activity';
            //     worksheet.getCell('A1').alignment = { horizontal: 'center' };
            //     worksheet.getCell('A1').font = { bold: true };

            //     worksheet.mergeCells('E1:I1'); // Old Data
            //     worksheet.getCell('E1').value = 'Old Data';
            //     worksheet.getCell('E1').alignment = { horizontal: 'center' };
            //     worksheet.getCell('E1').font = { bold: true };

            //     worksheet.mergeCells('J1:N1'); // New Data
            //     worksheet.getCell('J1').value = 'New Data';
            //     worksheet.getCell('J1').alignment = { horizontal: 'center' };
            //     worksheet.getCell('J1').font = { bold: true };

            //     // Define the sub-headers in row 3
            //     worksheet.getRow(3).values = [
            //         "Date", "Action By", "IP Address", " ",   // Activity sub-headers
            //         'Name', 'Email', 'Contact Number', 'Contact Person Name', 'Address',  // Old Data headers
            //         'Name', 'Email', 'Contact Number', 'Contact Person Name', 'Address'   // New Data headers
            //     ];

            //     worksheet.getRow(3).eachCell({ includeEmpty: true }, (cell) => {
            //         cell.font = { bold: true };
            //     });

            //     // Set column widths (optional)
            //     worksheet.columns = [
            //         { width: 25 }, // Column A - Date
            //         { width: 20 }, // Column B - Action By
            //         { width: 25 }, // Column C - IP Address
            //         { width: 10 }, // Column D - Empty for Activity
            //         { width: 20 }, // Column E - Old Data Name
            //         { width: 25 }, // Column F - Old Data Email
            //         { width: 25 }, // Column G - Old Data Contact Number
            //         { width: 30 }, // Column H - Old Data Contact Person Name
            //         { width: 30 }, // Column I - Old Data Address
            //         { width: 20 }, // Column J - New Data Name
            //         { width: 25 }, // Column K - New Data Email
            //         { width: 25 }, // Column L - New Data Contact Number
            //         { width: 30 }, // Column M - New Data Contact Person Name
            //         { width: 30 }  // Column N - New Data Address
            //     ];

            //     let currentRow = 4; // Start from row 4 for data

            //     // Add data to the worksheet
            //     if (data?.length > 0) {
            //         data.forEach((activity) => {
            //             activity.logs.forEach((log) => {
            //                 const oldData = log.old || {};
            //                 const newData = log.new || {};
            //                 const isCreated = Object.keys(oldData).length === 0; // Check if oldData is empty

            //                 if (isCreated) {
            //                     // Add a row for "Created" with merged cells for old data
            //                     worksheet.getCell(`A${currentRow}`).value = moment(activity.date).format('MMM DD, YYYY, hh:mm A') || '';
            //                     worksheet.getCell(`B${currentRow}`).value = activity.actionBy.name || '';
            //                     worksheet.getCell(`C${currentRow}`).value = activity.ipAddress || '';
            //                     worksheet.getCell(`D${currentRow}`).value = ''; // Empty cell for spacing
            //                     worksheet.mergeCells(`E${currentRow}:I${currentRow}`);
            //                     worksheet.getCell(`E${currentRow}`).value = 'Created';
            //                     worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
            //                     worksheet.getCell(`E${currentRow}`).font = { bold: true };

            //                     // Apply background color and text color for new data
            //                     worksheet.getCell(`J${currentRow}`).value = newData.name || '';
            //                     worksheet.getCell(`J${currentRow}`).fill = {
            //                         type: 'pattern',
            //                         pattern: 'solid',
            //                         fgColor: { argb: 'A5D1A5' }  // New Data background color
            //                     };
            //                     worksheet.getCell(`J${currentRow}`).font = { color: { argb: 'FFFFFF' } }; // Text color

            //                     worksheet.getCell(`K${currentRow}`).value = newData.email || '';
            //                     worksheet.getCell(`K${currentRow}`).fill = {
            //                         type: 'pattern',
            //                         pattern: 'solid',
            //                         fgColor: { argb: 'A5D1A5' }
            //                     };
            //                     worksheet.getCell(`K${currentRow}`).font = { color: { argb: 'FFFFFF' } };

            //                     worksheet.getCell(`L${currentRow}`).value = Number(newData.contactNumber) || '';
            //                     worksheet.getCell(`L${currentRow}`).fill = {
            //                         type: 'pattern',
            //                         pattern: 'solid',
            //                         fgColor: { argb: 'A5D1A5' }
            //                     };
            //                     worksheet.getCell(`L${currentRow}`).font = { color: { argb: 'FFFFFF' } };

            //                     worksheet.getCell(`M${currentRow}`).value = newData.contactPersonName || '';
            //                     worksheet.getCell(`M${currentRow}`).fill = {
            //                         type: 'pattern',
            //                         pattern: 'solid',
            //                         fgColor: { argb: 'A5D1A5' }
            //                     };
            //                     worksheet.getCell(`M${currentRow}`).font = { color: { argb: 'FFFFFF' } };

            //                     worksheet.getCell(`N${currentRow}`).value = newData.address || '';
            //                     worksheet.getCell(`N${currentRow}`).fill = {
            //                         type: 'pattern',
            //                         pattern: 'solid',
            //                         fgColor: { argb: 'A5D1A5' }
            //                     };
            //                     worksheet.getCell(`N${currentRow}`).font = { color: { argb: 'FFFFFF' } };

            //                 } else {
            //                     // Add a row for regular data
            //                     worksheet.addRow([
            //                         moment(activity.date).format('MMM DD, YYYY, hh:mm A') || '',
            //                         activity.actionBy.name || '',
            //                         activity.ipAddress || '',
            //                         '',
            //                         oldData.name || '',
            //                         oldData.email || '',
            //                         Number(oldData.contactNumber) || '',
            //                         oldData.contactPersonName || '',
            //                         oldData.address || '',
            //                         newData.name || '',
            //                         newData.email || '',
            //                         Number(newData.contactNumber) || '',
            //                         newData.contactPersonName || '',
            //                         newData.address || ''
            //                     ]);

            //                     // Apply background color and text color for old data
            //                     const row = worksheet.getRow(currentRow);
            //                     ['E', 'F', 'G', 'H', 'I'].forEach((col) => {
            //                         row.getCell(col).fill = {
            //                             type: 'pattern',
            //                             pattern: 'solid',
            //                             fgColor: { argb: '80BFFF' } // Old Data background color
            //                         };
            //                         row.getCell(col).font = { color: { argb: 'FFFFFF' } }; // Text color
            //                     });

            //                     // Apply background color and text color for new data
            //                     ['J', 'K', 'L', 'M', 'N'].forEach((col) => {
            //                         row.getCell(col).fill = {
            //                             type: 'pattern',
            //                             pattern: 'solid',
            //                             fgColor: { argb: 'A5D1A5' } // New Data background color
            //                         };
            //                         row.getCell(col).font = { color: { argb: 'FFFFFF' } }; // Text color
            //                     });
            //                 }

            //                 // Move to the next row
            //                 currentRow += 1;
            //             });
            //         });
            //     }

            //     // Write the file
            //     await workbook.xlsx.writeFile(filePath);
            // }


            /* -------------------------------------------------------------------------- */


            // also proper
            // if (!fs.existsSync(filePath)) {
            //     const workbook = new ExcelJS.Workbook();
            //     const worksheet = workbook.addWorksheet('Vendor Activity Logs');

            //     // Define the main headers
            //     worksheet.mergeCells('A1:c1'); //Activity 
            //     worksheet.getCell('A1').value = 'Activity';
            //     worksheet.getCell('A1').alignment = { horizontal: 'center' };
            //     worksheet.getCell('A1').font = { bold: true }; // Make the text bold


            //     worksheet.mergeCells('A1:E1'); // Old Data
            //     worksheet.getCell('A1').value = 'Old Data';
            //     worksheet.getCell('A1').alignment = { horizontal: 'center' };
            //     worksheet.getCell('A1').font = { bold: true }; // Make the text bold

            //     worksheet.mergeCells('F1:J1'); // New Data
            //     worksheet.getCell('F1').value = 'New Data';
            //     worksheet.getCell('F1').alignment = { horizontal: 'center' };
            //     worksheet.getCell('F1').font = { bold: true }; // Make the text bold

            //     // Define the sub-headers in row 3
            //     worksheet.getRow(3).values = [

            //         "Date", , "Action By", "IP Address", 'Name', 'Email', 'Contact Number', 'Contact Person Name', 'Address',  // Old Data headers
            //         "Date", , "Action By", "IP Address", 'Name', 'Email', 'Contact Number', 'Contact Person Name', 'Address'   // New Data headers
            //     ];

            //     worksheet.getRow(3).eachCell({ includeEmpty: true }, (cell) => {
            //         cell.font = { bold: true };
            //     });
            //     // Set column widths (optional)
            //     worksheet.columns = [
            //         { width: 40 }, // Column A
            //         { width: 40 }, // Column B
            //         { width: 40 }, // Column C
            //         { width: 40 }, // Column D
            //         { width: 25 }, // Column E
            //         { width: 25 }, // Column F
            //         { width: 30 }, // Column G
            //         { width: 30 }, // Column H
            //         { width: 20 }, // Column I
            //         { width: 25 }, // Column J
            //         { width: 25 }, // Column K
            //         { width: 30 }, // Column L
            //         { width: 30 }  // Column M
            //     ];

            //     let currentRow = 4; // Start from row 4 for data

            //     // Add data to the worksheet
            //     if (data?.length > 0) {
            //         data.forEach((activity) => {
            //             activity.logs.forEach((log) => {
            //                 const oldData = log.old || {};
            //                 const newData = log.new || {};
            //                 const isCreated = Object.keys(oldData).length === 0; // Check if oldData is empty

            //                 if (isCreated) {
            //                     // Add a row for "Created" with merged cells for old data
            //                     worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
            //                     const createdCell = worksheet.getCell(`A${currentRow}`);
            //                     createdCell.value = 'Created';
            //                     createdCell.alignment = { horizontal: 'center', vertical: 'middle' };
            //                     createdCell.font = { bold: true };

            //                     // Add the new data in the same row, after the merged cells
            //                     worksheet.getCell(`F${currentRow}`).value = newData.name || '';
            //                     worksheet.getCell(`G${currentRow}`).value = newData.email || '';
            //                     worksheet.getCell(`H${currentRow}`).value = Number(newData.contactNumber) || '';
            //                     worksheet.getCell(`I${currentRow}`).value = newData.contactPersonName || '';
            //                     worksheet.getCell(`J${currentRow}`).value = newData.address || '';

            //                     // Move to the next row
            //                     currentRow += 1;
            //                 } else {
            //                     // Add a row for regular data
            //                     worksheet.addRow([
            //                         moment(activity.date).format('MMM DD, YYYY, hh:mm A') || '',
            //                         activity.actionBy.name || '',
            //                         activity.actionBy || '',
            //                         oldData.name || '',
            //                         oldData.email || '',
            //                         Number(oldData.contactNumber) || '',
            //                         oldData.contactPersonName || '',
            //                         oldData.address || '',
            //                         newData.name || '',
            //                         newData.email || '',
            //                         Number(newData.contactNumber) || '',
            //                         newData.contactPersonName || '',
            //                         newData.address || ''
            //                     ]);

            //                     // Move to the next row
            //                     currentRow += 1;
            //                 }
            //             });
            //         });
            //     }

            //     // Write the file
            //     await workbook.xlsx.writeFile(filePath);
            // }



            await excelQueue.add("excelTask", { filePath }, { delay: 10000 });
            return resolve({ fileName, filePath, });

        } catch (error) {
            console.log("🚀 ~ file: vendorController.js:749 ~ returnnewPromise ~ error:", error)
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    })
};

module.exports = {
    addVendor,
    showAllVendor,
    showVendor,
    updateVendor,
    deleteVendor,
    activityVendor,
    activityVendorExcel
}