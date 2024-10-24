/* --------------------------------- backup attachment --------------------------------- */
// const activityAssetExcel = async () => {
//     return new Promise(async (resolve, reject) => {

//         console.log(" ========== Activity Asset Excel ========== ");
//         try {
//             const statusMapping = {
//                 [assetStatus?.available]: "Available",
//                 [assetStatus?.unavailable]: "Unavailable",
//                 [assetStatus?.assign]: "Assigned",
//                 [assetStatus?.associate]: "Associate"
//             };
//             const data = await Activity.find({ activityModel: activityConstant?.asset })
//                 .populate("actionBy")
//                 .lean(); // Use .lean() to make the data a plain JavaScript object

//             // Manually populate the nested fields in logs
//             for (let activity of data) {
//                 for (let logEntry of activity?.logs) {
//                     if (logEntry.old) {
//                         logEntry.old = await populateNestedFields(logEntry?.old);
//                     }
//                     if (logEntry.new) {
//                         logEntry.new = await populateNestedFields(logEntry?.new);
//                     }
//                 }
//             }

//             async function populateNestedFields(log) {

//                 // Populate all the fields that you want to populate
//                 if (log.category) {
//                     log.category = await Category.findById(log?.category);
//                     log.category = log?.category?.name
//                 }
//                 if (log.vendor) {
//                     log.vendor = await Vendor.findById(log?.vendor);
//                     log.vendor = log?.vendor?.name
//                 }
//                 if (log.condition) {
//                     log.condition = await Condition.findById(log?.condition);
//                     log.condition = log?.condition?.name
//                 }
//                 if (log.location) {
//                     log.location = await Location.findById(log?.location);
//                     log.location = log?.location?.name
//                 }
//                 if (log.tag) {
//                     log.tag = await Tag.findById(log?.tag);
//                     log.tag = log?.tag?.name
//                 }
//                 if (log.files) {
//                     log.files = log?.files?.map(file => {
//                         return file?.path
//                     })
//                 }
//                 if (log.assignTo) {
//                     log.assignTo = await User.findById(log?.assignTo);
//                     log.assignTo = log?.assignTo?.name
//                 }
//                 if (log.assignBy) {
//                     log.assignBy = await User.findById(log?.assignBy);
//                     log.assignBy = log?.assignBy?.name
//                 }
//                 if (log.associate) {
//                     log.associate = await Asset.find({ associate: { $in: log?.associate } });
//                     log.associate = log?.associate?.map(val => {
//                         return val?.assetId
//                     }).join(",");
//                 }
//                 if (log.assignAssets) {
//                     log.assignAssets = await Asset.findById(log.assignAssets);
//                     log.assignAssets = log?.assignAssets?.assetId
//                 }
//                 if (log.purchasedOn) {
//                     log.purchasedOn = moment(log?.purchasedOn).format("DD-MM-YYYY")
//                 }
//                 if (log.assignAt) {
//                     log.assignAt = moment(log?.assignAt).format("DD-MM-YYYY")
//                 }
//                 if (log.expireDateWarranty) {
//                     log.expireDateWarranty = moment(log?.expireDateWarranty).format("DD-MM-YYYY")
//                 }
//                 if (log.lastAuditDate) {
//                     log.lastAuditDate = moment(log?.lastAuditDate).format("DD-MM-YYYY")
//                 }
//                 if (log.status) {
//                     log.status = statusMapping[log?.status]
//                 }
//                 if (log.price) {
//                     log.price = Number(log?.price)
//                 }

//                 return log;
//             }
//             const fileName = `Asset_Activity_${moment().format("DD-MM-YYYY_H-mm-ss")}.xlsx`;
//             const filePath = path.join(importDir, fileName);

//             /* ------------------------------ without color ----------------------------- */
//             if (!fs.existsSync(filePath)) {
//                 const workbook = new ExcelJS.Workbook();
//                 const worksheet = workbook.addWorksheet('Asset Activity Logs');

//                 // Define the main headers
//                 worksheet.mergeCells('A1:D1'); // Activity
//                 worksheet.getCell('A1').value = 'Activity';
//                 worksheet.getCell('A1').alignment = { horizontal: 'center' };
//                 worksheet.getCell('A1').font = { bold: true };

//                 worksheet.mergeCells('E1:AA1'); // Old Data
//                 worksheet.getCell('E1').value = 'Old Data';
//                 worksheet.getCell('E1').alignment = { horizontal: 'center' };
//                 worksheet.getCell('E1').font = { bold: true };

//                 worksheet.mergeCells('AC1:AY1'); // New Data
//                 worksheet.getCell('AC1').value = 'New Data';
//                 worksheet.getCell('AC1').alignment = { horizontal: 'center' };
//                 worksheet.getCell('AC1').font = { bold: true };

//                 // Define the sub-headers in row 3
//                 worksheet.getRow(3).values = [
//                     "Date", "Action By", "IP Address", " ",   // Activity sub-headers
//                     'Category', 'AssetId', 'Name', 'Vendor', 'PurschaseOn (DD-MM-YYYY)', 'Serial Number', 'Expire Date Warranty (DD-MM-YYYY)', 'Expire Warranty Notify', 'Price', 'Location', 'Tag', 'Condition', 'Assign To', 'Assign By', 'Assign At (DD-MM-YYYY)', 'Description', 'Assign Assets', 'Associate', 'Status', 'Last Audit Date (DD-MM-YYYY)', 'Attachment 1', 'Attachment 2', 'Attachment 3', ' ',  // Old Data headers
//                     'Category', 'AssetId', 'Name', 'Vendor', 'PurschaseOn (DD-MM-YYYY)', 'Serial Number', 'Expire Date Warranty (DD-MM-YYYY)', 'Expire Warranty Notify', 'Price', 'Location', 'Tag', 'Condition', 'Assign To', 'Assign By', 'Assign At (DD-MM-YYYY)', 'Description', 'Assign Assets', 'Associate', 'Status', 'Last Audit Date (DD-MM-YYYY)', 'Attachment 1', 'Attachment 2', 'Attachment 3'  // New Data headers
//                 ];

//                 worksheet.getRow(3).eachCell({ includeEmpty: true }, (cell) => {
//                     cell.font = { bold: true };
//                 });

//                 // Set column widths (optional)
//                 worksheet.columns = [
//                     { width: 25 }, // Column A - Date
//                     { width: 20 }, // Column B - Action By
//                     { width: 25 }, // Column C - IP Address

//                     { width: 10 }, // Column D - Empty for Activity

//                     { width: 20 }, // Column E - Old Data Category
//                     { width: 20 }, // Column F - Old Data AssetId
//                     { width: 20 }, // Column G - Old Data Name
//                     { width: 20 }, // Column H - Old Data Vendor
//                     { width: 30 }, // Column I - Old Data Purschase on (DD-MM-YYYY)
//                     { width: 20 }, // Column J - Old Data Serial Number
//                     { width: 35 }, // Column K - Old Data Expire Date Warranty (DD-MM-YYYY)
//                     { width: 25 }, // Column L - Old Data Expire Warranty Notify
//                     { width: 20 }, // Column M - Old Data Price
//                     { width: 20 }, // Column N - Old Data Location
//                     { width: 20 }, // Column O - Old Data Tag
//                     { width: 20 }, // Column P - Old Data Condition
//                     { width: 20 }, // Column Q - Old Data Assign To
//                     { width: 20 }, // Column R - Old Data Assign By
//                     { width: 30 }, // Column S - Old Data Assign At (DD-MM-YYYY)
//                     { width: 30 }, // Column T - Old Data Description
//                     { width: 20 }, // Column U - Old Data Assign Assets
//                     { width: 30 }, // Column V - Old Data Associate
//                     { width: 20 }, // Column W - Old Data Status
//                     { width: 30 }, // Column X - Old Data Last Audit Date (DD-MM-YYYY)
//                     { width: 30 }, // Column Y - Old Data Attachement 1
//                     { width: 30 }, // Column Z - Old Data Attachement 2
//                     { width: 30 }, // Column AA - Old Data Attachement 3

//                     { width: 10 }, // Column AB - Empty for Old Data

//                     { width: 20 }, // Column AC - New Data Category
//                     { width: 20 }, // Column AD - New Data AssetId
//                     { width: 20 }, // Column AE - New Data Name
//                     { width: 20 }, // Column AF - New Data Vendor
//                     { width: 30 }, // Column AG - New Data Purschase on (DD-MM-YYYY)
//                     { width: 20 }, // Column AH - New Data Serial Number
//                     { width: 35 }, // Column AI - New Data Expire Date Warranty (DD-MM-YYYY)
//                     { width: 25 }, // Column AJ - New Data Expire Warranty Notify
//                     { width: 20 }, // Column AK - New Data Price
//                     { width: 20 }, // Column AL - New Data Location
//                     { width: 20 }, // Column AM - New Data Tag
//                     { width: 20 }, // Column AN - New Data Condition
//                     { width: 20 }, // Column AO - New Data Assign To
//                     { width: 20 }, // Column AP - New Data Assign By
//                     { width: 30 }, // Column AQ - New Data Assign At (DD-MM-YYYY)
//                     { width: 30 }, // Column AR - New Data Description
//                     { width: 20 }, // Column AS - New Data Assign Assets
//                     { width: 30 }, // Column AT - New Data Associate
//                     { width: 20 }, // Column AU - New Data Status
//                     { width: 30 }, // Column AV - New Data Last Audit Date (DD-MM-YYYY)
//                     { width: 30 }, // Column AW - New Data Attachment 1
//                     { width: 30 }, // Column AX - New Data Attachment 2
//                     { width: 30 }, // Column AY - New Data Attachment 3
//                 ];


//                 let currentRow = 4; // Start from row 4 for data
//                 // Add data to the worksheet
//                 if (data?.length > 0) {
//                     data.forEach((activity) => {
//                         activity.logs.forEach((log) => {
//                             const oldData = log.old || {};
//                             const newData = log.new || {};
//                             const isCreated = Object.keys(oldData).length === 0; // Check if oldData is empty
//                             if (isCreated) {
//                                 // Add a row for "Created" with merged cells for old data
//                                 worksheet.getCell(`A${currentRow}`).value = moment(activity.date).format('MMM DD, YYYY, hh:mm A') || '';
//                                 worksheet.getCell(`B${currentRow}`).value = activity.actionBy.name || '';
//                                 worksheet.getCell(`C${currentRow}`).value = activity.ipAddress || '';
//                                 worksheet.getCell(`D${currentRow}`).value = ''; // Empty cell for spacing

//                                 worksheet.mergeCells(`E${currentRow}:AA${currentRow}`);
//                                 worksheet.getCell(`E${currentRow}`).value = 'Created';
//                                 worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
//                                 worksheet.getCell(`E${currentRow}`).font = { bold: true };

//                                 worksheet.getCell(`AC${currentRow}`).value = newData.category || '';
//                                 worksheet.getCell(`AD${currentRow}`).value = newData.assetId || '';
//                                 worksheet.getCell(`AE${currentRow}`).value = newData.name || '';
//                                 worksheet.getCell(`AF${currentRow}`).value = newData.vendor || '';
//                                 worksheet.getCell(`AG${currentRow}`).value = newData.purchasedOn || '';
//                                 worksheet.getCell(`AH${currentRow}`).value = newData.serialNumber || '';
//                                 worksheet.getCell(`AI${currentRow}`).value = newData.expireDateWarranty || '';
//                                 worksheet.getCell(`AJ${currentRow}`).value = newData.expireWarrantyNotify || '';
//                                 worksheet.getCell(`AK${currentRow}`).value = newData.price || '';
//                                 worksheet.getCell(`AL${currentRow}`).value = newData.location || '';
//                                 worksheet.getCell(`AM${currentRow}`).value = newData.tag || '';
//                                 worksheet.getCell(`AN${currentRow}`).value = newData.condition || '';
//                                 worksheet.getCell(`AO${currentRow}`).value = newData.assignTo || '';
//                                 worksheet.getCell(`AP${currentRow}`).value = newData.assignBy || '';
//                                 worksheet.getCell(`AQ${currentRow}`).value = newData.assignAt || '';
//                                 worksheet.getCell(`AR${currentRow}`).value = newData.description || '';
//                                 worksheet.getCell(`AS${currentRow}`).value = newData.assignAssets || '';
//                                 worksheet.getCell(`AT${currentRow}`).value = newData.associate || '';
//                                 worksheet.getCell(`AU${currentRow}`).value = newData.status || '';
//                                 worksheet.getCell(`AV${currentRow}`).value = newData.lastAuditDate || '';
//                                 worksheet.getCell(`AW${currentRow}`).value = '';
//                                 worksheet.getCell(`AX${currentRow}`).value = '';
//                                 worksheet.getCell(`AY${currentRow}`).value = '';
//                             }
//                             else {
//                                 // Add a row for regular data
//                                 worksheet.addRow([
//                                     moment(activity.date).format('MMM DD, YYYY, hh:mm A') || '',
//                                     activity.actionBy.name || '',
//                                     activity.ipAddress || '',
//                                     '',
//                                     oldData.category || '',
//                                     oldData.assetId || '',
//                                     oldData.name || '',
//                                     oldData.vendor || '',
//                                     oldData.purchasedOn || '',
//                                     oldData.serialNumber || '',
//                                     oldData.expireDateWarranty || '',
//                                     oldData.expireWarrantyNotify || '',
//                                     oldData.price || '',
//                                     oldData.location || '',
//                                     oldData.tag || '',
//                                     oldData.condition || '',
//                                     oldData.assignTo || '',
//                                     oldData.assignBy || '',
//                                     oldData.assignAt || '',
//                                     oldData.description || '',
//                                     oldData.assignAssets || '',
//                                     oldData.associate || '',
//                                     oldData.status || '',
//                                     oldData.lastAuditDate || '',
//                                     '',
//                                     '',
//                                     '',

//                                     '',
//                                     newData.category || '',
//                                     newData.assetId || '',
//                                     newData.name || '',
//                                     newData.vendor || '',
//                                     newData.purchasedOn || '',
//                                     newData.serialNumber || '',
//                                     newData.expireDateWarranty || '',
//                                     newData.expireWarrantyNotify || '',
//                                     newData.price || '',
//                                     newData.location || '',
//                                     newData.tag || '',
//                                     newData.condition || '',
//                                     newData.assignTo || '',
//                                     newData.assignBy || '',
//                                     newData.assignAt || '',
//                                     newData.description || '',
//                                     newData.assignAssets || '',
//                                     newData.associate || '',
//                                     newData.status || '',
//                                     newData.lastAuditDate || '',
//                                     '',
//                                     '',
//                                     '',
//                                 ]);

//                             }

//                             if (oldData.files && oldData.files.length > 0) {
//                                 oldData.files.slice(0, 3).forEach((filePath, index) => {
//                                     const extension = path.extname(filePath).substring(1);
//                                     const imageId = workbook.addImage({
//                                         filename: filePath,
//                                         extension: extension
//                                     });
//                                     console.log("currentRow::::::::::>>>>>>> before", currentRow);

//                                     worksheet.addImage(imageId, {
//                                         tl: { col: 24 + index, row: currentRow - 1 }, // Adjusting column for U, V, W, etc.
//                                         ext: { width: 40, height: 40 }, // Adjust image size
//                                     });
//                                     console.log("currentRow::::::::::>>>>>>> after", currentRow);
//                                 });
//                                 worksheet.getRow(currentRow).height = 30;
//                             }
//                             if (newData.files && newData.files.length > 0) {
//                                 newData.files.slice(0, 3).forEach((filePath, index) => {
//                                     const extension = path.extname(filePath).substring(1);
//                                     const imageId = workbook.addImage({
//                                         filename: filePath,
//                                         extension: extension
//                                     });
//                                     console.log("currentRow::::::::::>>>>>>> before", currentRow);

//                                     worksheet.addImage(imageId, {
//                                         tl: { col: 48 + index, row: currentRow - 1 }, // Adjusting column for U, V, W, etc.
//                                         ext: { width: 40, height: 40 }, // Adjust image size
//                                     });
//                                     console.log("currentRow::::::::::>>>>>>> after", currentRow);
//                                 });
//                                 worksheet.getRow(currentRow).height = 30;
//                             }

//                             // Move to the next row
//                             currentRow += 1;
//                         });
//                     });
//                 }

//                 // Write the file
//                 await workbook.xlsx.writeFile(filePath);
//             }

//             await excelQueue.add("excelTask", { filePath }, { delay: 10000 });
//             return resolve({ fileName, filePath, });

//         } catch (error) {
//             console.log(error);
//             return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
//         }
//     })
// };



/* ------------------------------ side by side ------------------------------ */
const activityAssetExcel = async () => {
    return new Promise(async (resolve, reject) => {

        console.log(" ========== Activity Asset Excel ========== ");
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
                    { width: 20, header: "Old Asset Id" }, // Column G - Old Data AssetId
                    { width: 20, header: "New Asset Id" }, // Column H - New Data AssetId
                    { width: 20, header: "Old Name" }, // Column I - Old Data Name
                    { width: 20, header: "New Name" }, // Column J - new Data Name
                    { width: 20, header: "Old Vendor" }, // Column K - Old Data Vendor
                    { width: 20, header: "New Vendor" }, // Column L - New Data Vendor
                    { width: 35, header: "Old Purschase on (DD-MM-YYYY)" }, // Column M - Old Data Purschase on (DD-MM-YYYY)
                    { width: 35, header: "New Purschase on (DD-MM-YYYY)" }, // Column N - New Data Purschase on (DD-MM-YYYY)
                    { width: 25, header: "Old Serial Number" }, // Column O - Old Data Serial Number
                    { width: 25, header: "New Serial Number" }, // Column P - New Data Serial Number
                    { width: 35, header: "Old Expire Date Warranty (DD-MM-YYYY)" }, // Column Q - Old Data Expire Date Warranty (DD-MM-YYYY)
                    { width: 35, header: "New Expire Date Warranty (DD-MM-YYYY)" }, // Column R - New Data Expire Date Warranty (DD-MM-YYYY)
                    { width: 25, header: "Old Expire Warranty Notify" }, // Column S - Old Data Expire Warranty Notify
                    { width: 25, header: "New Expire Warranty Notify" }, // Column T - New Data Expire Warranty Notify
                    { width: 20, header: "Old Price" }, // Column U - Old Data Price
                    { width: 20, header: "New Price" }, // Column V - New Data Price
                    { width: 20, header: "Old Location" }, // Column W - Old Data Location
                    { width: 20, header: "New Location" }, // Column X - New Data Location
                    { width: 20, header: "Old Tag" }, // Column Y - Old Data Tag
                    { width: 20, header: "New Tag" }, // Column Z - New Data Tag
                    { width: 20, header: "Old Condition" }, // Column AA - Old Data Condition
                    { width: 20, header: "New Condition" }, // Column AB - New Data Condition
                    { width: 20, header: "Old Assign To" }, // Column AC - Old Data Assign To
                    { width: 20, header: "New Assign To" }, // Column AD - New Data Assign To
                    { width: 20, header: "Old Assign By" }, // Column AE - Old Data Assign By
                    { width: 20, header: "New Assign By" }, // Column AF - New Data Assign By
                    { width: 30, header: "Old Assign At (DD-MM-YYYY)" }, // Column AG - Old Data Assign At (DD-MM-YYYY)
                    { width: 30, header: "New Assign At (DD-MM-YYYY)" }, // Column AH - New Data Assign At (DD-MM-YYYY)
                    { width: 30, header: "Old Description" }, // Column AI - Old Data Description
                    { width: 30, header: "New Description" }, // Column AJ - New Data Description
                    { width: 20, header: "Old Assign Asset" }, // Column AK - Old Data Assign Assets
                    { width: 20, header: "New Assign Asset" }, // Column AL - New Data Assign Assets
                    { width: 30, header: "Old Associate" }, // Column AM - Old Data Associate
                    { width: 30, header: "New Associate" }, // Column AN - New Data Associate
                    { width: 20, header: "Old Status" }, // Column AO - Old Data Status
                    { width: 20, header: "New Status" }, // Column AP - New Data Status
                    { width: 35, header: "Old Last Audit Date (DD-MM-YYYY)" }, // Column AQ - Old Data Last Audit Date (DD-MM-YYYY)
                    { width: 35, header: "New Last Audit Date (DD-MM-YYYY)" }, // Column AR - New Data Last Audit Date (DD-MM-YYYY)
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


// const activityAssetExcel = async () => {
//     return new Promise(async (resolve, reject) => {

//         console.log(" ========== Activity Asset Excel ========== ");
//         try {
//             const statusMapping = {
//                 [assetStatus?.available]: "Available",
//                 [assetStatus?.unavailable]: "Unavailable",
//                 [assetStatus?.assign]: "Assigned",
//                 [assetStatus?.associate]: "Associate"
//             };
//             const data = await Activity.find({ activityModel: activityConstant?.asset })
//                 .populate("actionBy")
//                 .lean(); // Use .lean() to make the data a plain JavaScript object

//             // Manually populate the nested fields in logs
//             for (let activity of data) {
//                 for (let logEntry of activity?.logs) {
//                     if (logEntry.old) {
//                         logEntry.old = await populateNestedFields(logEntry?.old);
//                     }
//                     if (logEntry.new) {
//                         logEntry.new = await populateNestedFields(logEntry?.new);
//                     }
//                 }
//             }

//             async function populateNestedFields(log) {

//                 // Populate all the fields that you want to populate
//                 if (log.category) {
//                     log.category = await Category.findById(log?.category);
//                     log.category = log?.category?.name
//                 }
//                 if (log.vendor) {
//                     log.vendor = await Vendor.findById(log?.vendor);
//                     log.vendor = log?.vendor?.name
//                 }
//                 if (log.condition) {
//                     log.condition = await Condition.findById(log?.condition);
//                     log.condition = log?.condition?.name
//                 }
//                 if (log.location) {
//                     log.location = await Location.findById(log?.location);
//                     log.location = log?.location?.name
//                 }
//                 if (log.tag) {
//                     log.tag = await Tag.findById(log?.tag);
//                     log.tag = log?.tag?.name
//                 }
//                 if (log.files) {
//                     log.files = log?.files?.map(file => {
//                         return file?.path
//                     })
//                 }
//                 if (log.assignTo) {
//                     log.assignTo = await User.findById(log?.assignTo);
//                     log.assignTo = log?.assignTo?.name
//                 }
//                 if (log.assignBy) {
//                     log.assignBy = await User.findById(log?.assignBy);
//                     log.assignBy = log?.assignBy?.name
//                 }
//                 if (log.associate) {
//                     log.associate = await Asset.find({ associate: { $in: log?.associate } });
//                     log.associate = log?.associate?.map(val => {
//                         return val?.assetId
//                     }).join(",");
//                 }
//                 if (log.assignAssets) {
//                     log.assignAssets = await Asset.findById(log.assignAssets);
//                     log.assignAssets = log?.assignAssets?.assetId
//                 }
//                 if (log.purchasedOn) {
//                     log.purchasedOn = moment(log?.purchasedOn).format("DD-MM-YYYY")
//                 }
//                 if (log.assignAt) {
//                     log.assignAt = moment(log?.assignAt).format("DD-MM-YYYY")
//                 }
//                 if (log.expireDateWarranty) {
//                     log.expireDateWarranty = moment(log?.expireDateWarranty).format("DD-MM-YYYY")
//                 }
//                 if (log.lastAuditDate) {
//                     log.lastAuditDate = moment(log?.lastAuditDate).format("DD-MM-YYYY")
//                 }
//                 if (log.status) {
//                     log.status = statusMapping[log?.status]
//                 }
//                 if (log.price) {
//                     log.price = Number(log?.price)
//                 }

//                 return log;
//             }
//             const fileName = `Asset_Activity_${moment().format("DD-MM-YYYY_H-mm-ss")}.xlsx`;
//             const filePath = path.join(importDir, fileName);

//             /* ------------------------------ without color ----------------------------- */
//             if (!fs.existsSync(filePath)) {
//                 const workbook = new ExcelJS.Workbook();
//                 const worksheet = workbook.addWorksheet('Asset Activity Logs');

//                 // Define the main headers
//                 worksheet.mergeCells('A1:D1'); // Activity
//                 worksheet.getCell('A1').value = 'Activity';
//                 worksheet.getCell('A1').alignment = { horizontal: 'center' };
//                 worksheet.getCell('A1').font = { bold: true };

//                 worksheet.mergeCells('E1:X1'); // Old Data
//                 worksheet.getCell('E1').value = 'Old Data';
//                 worksheet.getCell('E1').alignment = { horizontal: 'center' };
//                 worksheet.getCell('E1').font = { bold: true };

//                 worksheet.mergeCells('Z1:AR1'); // New Data
//                 worksheet.getCell('Z1').value = 'New Data';
//                 worksheet.getCell('Z1').alignment = { horizontal: 'center' };
//                 worksheet.getCell('Z1').font = { bold: true };

//                 // Define the sub-headers in row 3
//                 worksheet.getRow(3).values = [
//                     "Date", "Action By", "IP Address", " ",   // Activity sub-headers
//                     'Category', 'AssetId', 'Name', 'Vendor', 'PurschaseOn (DD-MM-YYYY)', 'Serial Number', 'Expire Date Warranty (DD-MM-YYYY)', 'Expire Warranty Notify', 'Price', 'Location', 'Tag', 'Condition', 'Assign To', 'Assign By', 'Assign At (DD-MM-YYYY)', 'Description', 'Assign Assets', 'Associate', 'Status', 'Last Audit Date (DD-MM-YYYY)', ' ',  // Old Data headers
//                     'Category', 'AssetId', 'Name', 'Vendor', 'PurschaseOn (DD-MM-YYYY)', 'Serial Number', 'Expire Date Warranty (DD-MM-YYYY)', 'Expire Warranty Notify', 'Price', 'Location', 'Tag', 'Condition', 'Assign To', 'Assign By', 'Assign At (DD-MM-YYYY)', 'Description', 'Assign Assets', 'Associate', 'Status', 'Last Audit Date (DD-MM-YYYY)'  // New Data headers
//                 ];

//                 worksheet.getRow(3).eachCell({ includeEmpty: true }, (cell) => {
//                     cell.font = { bold: true };
//                 });

//                 // Set column widths (optional)
//                 worksheet.columns = [
//                     { width: 25 }, // Column A - Date
//                     { width: 20 }, // Column B - Action By
//                     { width: 25 }, // Column C - IP Address

//                     { width: 10 }, // Column D - Empty for Activity

//                     { width: 20 }, // Column E - Old Data Category
//                     { width: 20 }, // Column F - Old Data AssetId
//                     { width: 20 }, // Column G - Old Data Name
//                     { width: 20 }, // Column H - Old Data Vendor
//                     { width: 30 }, // Column I - Old Data Purschase on (DD-MM-YYYY)
//                     { width: 20 }, // Column J - Old Data Serial Number
//                     { width: 35 }, // Column K - Old Data Expire Date Warranty (DD-MM-YYYY)
//                     { width: 25 }, // Column L - Old Data Expire Warranty Notify
//                     { width: 20 }, // Column M - Old Data Price
//                     { width: 20 }, // Column N - Old Data Location
//                     { width: 20 }, // Column O - Old Data Tag
//                     { width: 20 }, // Column P - Old Data Condition
//                     { width: 20 }, // Column Q - Old Data Assign To
//                     { width: 20 }, // Column R - Old Data Assign By
//                     { width: 30 }, // Column S - Old Data Assign At (DD-MM-YYYY)
//                     { width: 30 }, // Column T - Old Data Description
//                     { width: 20 }, // Column U - Old Data Assign Assets
//                     { width: 30 }, // Column V - Old Data Associate
//                     { width: 20 }, // Column W - Old Data Status
//                     { width: 30 }, // Column X - Old Data Last Audit Date (DD-MM-YYYY)

//                     { width: 10 }, // Column Y - Empty for Old Data

//                     { width: 20 }, // Column Z - New Data Category
//                     { width: 20 }, // Column AA - New Data AssetId
//                     { width: 20 }, // Column AB - New Data Name
//                     { width: 20 }, // Column AC - New Data Vendor
//                     { width: 30 }, // Column AD - New Data Purschase on (DD-MM-YYYY)
//                     { width: 20 }, // Column AE - New Data Serial Number
//                     { width: 35 }, // Column AF - New Data Expire Date Warranty (DD-MM-YYYY)
//                     { width: 25 }, // Column AG - New Data Expire Warranty Notify
//                     { width: 20 }, // Column AH - New Data Price
//                     { width: 20 }, // Column AI - New Data Location
//                     { width: 20 }, // Column AJ - New Data Tag
//                     { width: 20 }, // Column AK - New Data Condition
//                     { width: 20 }, // Column AL - New Data Assign To
//                     { width: 20 }, // Column AM - New Data Assign By
//                     { width: 30 }, // Column AN - New Data Assign At (DD-MM-YYYY)
//                     { width: 30 }, // Column AO - New Data Description
//                     { width: 20 }, // Column AP - New Data Assign Assets
//                     { width: 30 }, // Column AQ - New Data Associate
//                     { width: 20 }, // Column AR - New Data Status
//                     { width: 30 }, // Column AS - New Data Last Audit Date (DD-MM-YYYY)
//                 ];


//                 let currentRow = 4; // Start from row 4 for data

//                 // Add data to the worksheet
//                 if (data?.length > 0) {
//                     data.forEach((activity) => {
//                         activity.logs.forEach((log) => {
//                             const oldData = log.old || {};
//                             const newData = log.new || {};
//                             const isCreated = Object.keys(oldData).length === 0; // Check if oldData is empty

//                             if (isCreated) {
//                                 // Add a row for "Created" with merged cells for old data
//                                 worksheet.getCell(`A${currentRow}`).value = moment(activity.date).format('MMM DD, YYYY, hh:mm A') || '';
//                                 worksheet.getCell(`B${currentRow}`).value = activity.actionBy.name || '';
//                                 worksheet.getCell(`C${currentRow}`).value = activity.ipAddress || '';
//                                 worksheet.getCell(`D${currentRow}`).value = ''; // Empty cell for spacing

//                                 worksheet.mergeCells(`E${currentRow}:W${currentRow}`);
//                                 worksheet.getCell(`E${currentRow}`).value = 'Created';
//                                 worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
//                                 worksheet.getCell(`E${currentRow}`).font = { bold: true };

//                                 worksheet.getCell(`Z${currentRow}`).value = newData.category || '';
//                                 worksheet.getCell(`AA${currentRow}`).value = newData.assetId || '';
//                                 worksheet.getCell(`AB${currentRow}`).value = newData.name || '';
//                                 worksheet.getCell(`AC${currentRow}`).value = newData.vendor || '';
//                                 worksheet.getCell(`AD${currentRow}`).value = newData.purchasedOn || '';
//                                 worksheet.getCell(`AE${currentRow}`).value = newData.serialNumber || '';
//                                 worksheet.getCell(`AF${currentRow}`).value = newData.expireDateWarranty || '';
//                                 worksheet.getCell(`AG${currentRow}`).value = newData.expireWarrantyNotify || '';
//                                 worksheet.getCell(`AH${currentRow}`).value = newData.price || '';
//                                 worksheet.getCell(`AI${currentRow}`).value = newData.location || '';
//                                 worksheet.getCell(`AJ${currentRow}`).value = newData.tag || '';
//                                 worksheet.getCell(`AK${currentRow}`).value = newData.condition || '';
//                                 worksheet.getCell(`AL${currentRow}`).value = newData.assignTo || '';
//                                 worksheet.getCell(`AM${currentRow}`).value = newData.assignBy || '';
//                                 worksheet.getCell(`AN${currentRow}`).value = newData.assignAt || '';
//                                 worksheet.getCell(`AO${currentRow}`).value = newData.description || '';
//                                 worksheet.getCell(`AP${currentRow}`).value = newData.assignAssets || '';
//                                 worksheet.getCell(`AQ${currentRow}`).value = newData.associate || '';
//                                 worksheet.getCell(`AR${currentRow}`).value = newData.status || '';
//                                 worksheet.getCell(`AS${currentRow}`).value = newData.lastAuditDate || '';
//                             } else {
//                                 // Add a row for regular data
//                                 worksheet.addRow([
//                                     moment(activity.date).format('MMM DD, YYYY, hh:mm A') || '',
//                                     activity.actionBy.name || '',
//                                     activity.ipAddress || '',
//                                     '',
//                                     oldData.category || '',
//                                     oldData.assetId || '',
//                                     oldData.name || '',
//                                     oldData.vendor || '',
//                                     oldData.purchasedOn || '',
//                                     oldData.serialNumber || '',
//                                     oldData.expireDateWarranty || '',
//                                     oldData.expireWarrantyNotify || '',
//                                     oldData.price || '',
//                                     oldData.location || '',
//                                     oldData.tag || '',
//                                     oldData.condition || '',
//                                     oldData.assignTo || '',
//                                     oldData.assignBy || '',
//                                     oldData.assignAt || '',
//                                     oldData.description || '',
//                                     oldData.assignAssets || '',
//                                     oldData.associate || '',
//                                     oldData.status || '',
//                                     oldData.lastAuditDate || '',
//                                     '',
//                                     newData.category || '',
//                                     newData.assetId || '',
//                                     newData.name || '',
//                                     newData.vendor || '',
//                                     newData.purchasedOn || '',
//                                     newData.serialNumber || '',
//                                     newData.expireDateWarranty || '',
//                                     newData.expireWarrantyNotify || '',
//                                     newData.price || '',
//                                     newData.location || '',
//                                     newData.tag || '',
//                                     newData.condition || '',
//                                     newData.assignTo || '',
//                                     newData.assignBy || '',
//                                     newData.assignAt || '',
//                                     newData.description || '',
//                                     newData.assignAssets || '',
//                                     newData.associate || '',
//                                     newData.status || '',
//                                     newData.lastAuditDate || '',
//                                 ]);

//                             }


//                             // Move to the next row
//                             currentRow += 1;
//                         });
//                     });
//                 }

//                 // Write the file
//                 await workbook.xlsx.writeFile(filePath);
//             }

//             await excelQueue.add("excelTask", { filePath }, { delay: 10000 });
//             return resolve({ fileName, filePath, });

//         } catch (error) {
//             console.log(error);
//             return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
//         }
//     })
// };
