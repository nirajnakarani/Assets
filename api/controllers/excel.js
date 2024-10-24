const { HTTP, assetStatus, importDir } = require('../../constant/constant');
const ExcelJS = require('exceljs');
const Asset = require("../../models/assestsModel");
const Category = require("../../models/categoryModel");
const SubCategory = require('../../models/subCategoryModel');
const Location = require("../../models/locationModel");
const Condition = require("../../models/conditionModel");
const Vendor = require("../../models/vendorModel");
const Tag = require("../../models/tagModel");
const importAssetModel = require("../../models/importAssetData");
const moment = require('moment');
const path = require("path")
const fs = require("fs")
const { ObjectId } = require("mongodb");
const { addAssets } = require('../../controllers/assetsController');
const { excelQueue } = require('../../redis/queue');
const redis = require("../../redis/redisConfig")


// field mapping for db field
const fieldMapping = {
    'Category': 'category',
    'Sub Category': 'subCategory',
    'Asset ID': 'assetId',
    'Asset Name': 'name',
    'Vendor Name': 'vendor',
    'Purchased On (DD-MM-YYYY)': 'purchasedOn',
    'Expire Date Warranty (DD-MM-YYYY)': 'expireDateWarranty',
    'Serial Number': 'serialNumber',
    'Price': 'price',
    'Location': 'location',
    'Condition': 'condition',
    'Tag': 'tag',
    'Asset Description': 'description',
    'Last Audit': 'lastAuditDate',
    'createdBy': 'createdBy'
};

const errFieldMapping = {
    'category': 'Category',
    'subCategory': 'Sub Category',
    'assetId': 'Asset ID',
    'name': 'Asset Name',
    'vendor': 'Vendor Name',
    'purchasedOn': 'Purchased On (DD-MM-YYYY)',
    'expireDateWarranty': 'Expire Date Warranty (DD-MM-YYYY)',
    'serialNumber': 'Serial Number',
    'price': 'Price',
    'location': 'Location',
    'condition': 'Condition',
    'tag': 'Tag',
    'description': 'Asset Description',
    'lastAuditDate': 'Last Audit',
    'createdBy': 'createdBy'
};

const excelHeader = [
    { header: 'Category', key: "category", width: 15 },
    { header: 'Sub Category', key: "subCategory", width: 15 },
    { header: 'Asset ID', key: "assetId", width: 15 },
    { header: 'Asset Name', key: "name", width: 15 },
    { header: 'Vendor Name', key: "vendor", width: 15 },
    { header: 'Purchased On (DD-MM-YYYY)', key: "purchasedOn", width: 30 },
    { header: 'Expire Date Warranty (DD-MM-YYYY)', key: "expireDateWarranty", width: 40 },
    { header: 'Serial Number', key: "serialNumber", width: 30 },
    { header: 'Price', key: "price", width: 15 },
    { header: 'Location', key: "location", width: 15 },
    { header: 'Condition', key: "condition", width: 15 },
    { header: 'Tag', key: "tag", width: 15 },
    { header: 'Asset Description', key: "description", width: 40 },
    { header: 'Last Audit (DD-MM-YYYY)', key: "lastAuditDate", width: 40 },
]
const excelDownloadHeader = [
    { header: 'Category', key: "category", width: 15 },
    { header: 'Sub Category', key: "subCategory", width: 15 },
    { header: 'Asset ID', key: "assetId", width: 15 },
    { header: 'Asset Name', key: "name", width: 20 },
    { header: 'Vendor Name', key: "vendor", width: 15 },
    { header: 'Purchased On (DD-MM-YYYY)', key: "purchasedOn", width: 30 },
    { header: 'Expire Date Warranty (DD-MM-YYYY)', key: "expireDateWarranty", width: 40 },
    { header: 'Serial Number', key: "serialNumber", width: 30 },
    { header: 'Price', key: "price", width: 15 },
    { header: 'Location', key: "location", width: 15 },
    { header: 'Condition', key: "condition", width: 15 },
    { header: 'Tag', key: "tag", width: 15 },
    { header: 'Asset Description', key: "description", width: 40 },
    { header: 'Status', key: "status", width: 20 },
    { header: 'Imported', key: "isImport", width: 20 },
    { header: 'Assign To', key: "assignTo", width: 30 },
    { header: 'Assign By', key: "assignBy", width: 30 },
    { header: 'Assign At (DD-MM-YYYY)', key: "assignAt", width: 30 },
    { header: 'Assign Asset', key: "assignAssets", width: 30 },
    { header: 'Associate Assets', key: "associate", width: 30 },
    { header: 'Last Audit (DD-MM-YYYY)', key: "lastAuditDate", width: 40 },
    { header: 'Created By', key: "createdBy", width: 30 },
]

// const createExcelWithDropdown = async (data, dropdownOptions) => {

//     // Create a new workbook and add a worksheet for data
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Sheet1');

//     // Add column headers
//     worksheet.columns = [
//         { header: 'ID', key: 'id', width: 30 },
//         { header: 'Name', key: 'name', width: 30 },
//         { header: 'Value', key: 'value', width: 30 },
//     ];

//     // Add data rows
//     data.forEach(item => {
//         worksheet.addRow(item);
//     });

//     // Add a hidden worksheet for dropdown options
//     const dropdownSheet = workbook.addWorksheet('DropdownOptions', { state: 'hidden' });
//     dropdownSheet.columns = [{ header: 'Options', width: 30 }];

//     // Populate the hidden worksheet with dropdown options
//     dropdownOptions.forEach((option, index) => {
//         dropdownSheet.getCell(`A${index + 1}`).value = option || "";
//     });

//     // Define the range of dropdown options
//     const totalRows = dropdownOptions.length;
//     const dropdownRange = `DropdownOptions!$A$1:$A$${totalRows}`;

//     worksheet.dataValidations.add('A1:A9999', {
//         type: 'list',
//         allowBlank: true,
//         formulae: [dropdownRange],
//     });

//     // Return the workbook
//     return workbook;
// };

// const downloadSample = async (req, res) => {
//     const data = [
//         { id: 1, name: 'John Doe', value: 'Value 1' },
//         { id: 2, name: 'Jane Doe', value: 'Value 2' },
//     ];

//     // Generate dropdown options from 1 to 10
//     const dropdownOptions = Array.from({ length: 10 }, (_, i) => (i + 1));

//     try {
//         const workbook = await createExcelWithDropdown(data, dropdownOptions);

//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//         res.setHeader('Content-Disposition', 'attachment; filename=output.xlsx');

//         await workbook.xlsx.write(res);
//         res.end();
//     } catch (error) {
//         console.error('Error creating or sending Excel file:', error);
//         res.status(500).send('An error occurred while generating the Excel file.');
//     }
// };


const createExcelWithDropdown = async (data, isDropDown) => {
    return new Promise(async (resolve, reject) => {
        try {

            // Create a new workbook and add a worksheet for data
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sheet1');


            if (isDropDown) {
                // const templatePath = path.join(importDir, "Asset_Sample.xlsx")
                // await workbook.xlsx.readFile(templatePath);
                // const worksheet = workbook.worksheets[0];

                // fetch data from data
                // const [categoryData, subCategoryData, locationData, vendorData, conditionData, tagData] = await Promise.all([
                //     Category.find({ isActive: true, isDeleted: false }).select("name _id"),
                //     SubCategory.find({ isActive: true, isDeleted: false }).select("name category _id").populate("category", "name"),
                //     Location.find({ isActive: true, isDeleted: false }).select('name _id'),
                //     Vendor.find({ isActive: true, isDeleted: false }).select('name _id'),
                //     Condition.find({ isActive: true, isDeleted: false }).select('name _id'),
                //     Tag.find({ isActive: true, isDeleted: false }).select('name _id')
                // ]);
                // const dropdownData = {
                //     category: categoryData.map(cat => cat?.name),
                //     subCategory: subCategoryData.map(cat => cat?.name),
                //     location: locationData.map(loc => loc?.name),
                //     vendor: vendorData.map(ven => ven?.name),
                //     condition: conditionData.map(con => con?.name),
                //     tag: tagData.map(tag => tag?.name)
                // };

                // // Add column headers
                // worksheet.columns = excelHeader;

                // // for bold text header row
                // worksheet.getRow(1).eachCell((cell) => {
                //     cell.font = { bold: true };
                // });

                // // if many data then add all row 
                // if (data?.length > 0) {
                //     data?.forEach(val => {
                //         worksheet.addRow(val);
                //     })
                // }
                // const addDropdownSheet = (sheetName, data) => {
                //     const sheet = workbook.addWorksheet(sheetName, { state: 'hidden' });
                //     sheet.columns = [{ header: sheetName, width: 30 }];
                //     data.forEach((option, index) => {
                //         sheet.getCell(`A${index + 1}`).value = option || "";
                //     });
                //     return sheet;
                // };

                // addDropdownSheet('categoryDropDown', dropdownData.category);
                // addDropdownSheet('subCategoryDropDown', dropdownData.subCategory);
                // addDropdownSheet('vendorDropDown', dropdownData.vendor);
                // addDropdownSheet('locationDropDown', dropdownData.location);
                // addDropdownSheet('conditionDropDown', dropdownData.condition);
                // addDropdownSheet('tagDropDown', dropdownData.tag);

                // const dataValidations = [
                //     { range: 'A2:A9999', formula: `categoryDropDown!$A$1:$A$${dropdownData.category.length}` },
                //     { range: 'B2:B9999', formula: `subCategoryDropDown!$A$1:$A$${dropdownData.subCategory.length}` },
                //     { range: 'E2:E9999', formula: `vendorDropDown!$A$1:$A$${dropdownData.vendor.length}` },
                //     { range: 'J2:J9999', formula: `locationDropDown!$A$1:$A$${dropdownData.location.length}` },
                //     { range: 'K2:K9999', formula: `conditionDropDown!$A$1:$A$${dropdownData.condition.length}` },
                //     { range: 'L2:L9999', formula: `tagDropDown!$A$1:$A$${dropdownData.tag.length}` },
                // ];

                // dataValidations.forEach(({ range, formula }) => {
                //     worksheet.dataValidations.add(range, {
                //         type: 'list',
                //         allowBlank: true,
                //         formulae: [formula],
                //     });
                // });


                const [categoryData, subCategoryData, locationData, vendorData, conditionData, tagData] = await Promise.all([
                    Category.find({ isActive: true, isDeleted: false }).select("name _id"),
                    SubCategory.find({ isActive: true, isDeleted: false }).select("name category _id").populate("category", "name"),
                    Location.find({ isActive: true, isDeleted: false }).select('name _id'),
                    Vendor.find({ isActive: true, isDeleted: false }).select('name _id'),
                    Condition.find({ isActive: true, isDeleted: false }).select('name _id'),
                    Tag.find({ isActive: true, isDeleted: false }).select('name _id')
                ]);

                const dropdownData = {
                    category: categoryData.map(cat => cat?.name),
                    subCategory: subCategoryData.reduce((acc, subCat) => {
                        if (!acc[subCat.category.name]) acc[subCat.category.name] = [];
                        acc[subCat.category.name].push(subCat.name);
                        return acc;
                    }, {}),
                    location: locationData.map(loc => loc?.name),
                    vendor: vendorData.map(ven => ven?.name),
                    condition: conditionData.map(con => con?.name),
                    tag: tagData.map(tag => tag?.name)
                };

                // Add column headers
                worksheet.columns = excelHeader;

                // For bold text header row
                worksheet.getRow(1).eachCell((cell) => {
                    cell.font = { bold: true };
                });

                // if many data then add all row 
                if (data?.length > 0) {
                    data?.forEach(val => {
                        worksheet.addRow(val);
                    })
                }

                // Create a sheet for each category
                const categorySheets = {};
                for (const category in dropdownData.subCategory) {
                    // Check if the sheet already exists
                    const existingSheet = workbook.getWorksheet(category);

                    // If the sheet exists, remove it
                    if (existingSheet) {
                        workbook.removeWorksheet(existingSheet.id);
                    }

                    // Add a new sheet for the category
                    categorySheets[category] = workbook.addWorksheet(category, { state: "hidden" });
                    const subCategories = dropdownData.subCategory[category];
                    for (let i = 0; i < subCategories.length; i++) {
                        categorySheets[category].getCell(`A${i + 1}`).value = subCategories[i];
                    }
                }

                // Add dropdown sheets for other dropdown data
                const addDropdownSheet = (sheetName, data) => {
                    // Check if the sheet already exists
                    const existingSheet = workbook.getWorksheet(sheetName);

                    // If the sheet exists, remove it
                    if (existingSheet) {
                        workbook.removeWorksheet(existingSheet.id);
                    }

                    // Add a new sheet with the same name
                    const sheet = workbook.addWorksheet(sheetName, { state: "hidden" });
                    sheet.columns = [{ header: sheetName, width: 30 }];
                    data.forEach((option, index) => {
                        sheet.getCell(`A${index + 1}`).value = option || "";
                    });
                    return sheet;
                };

                addDropdownSheet('locationDropDown', dropdownData.location);
                addDropdownSheet('vendorDropDown', dropdownData.vendor);
                addDropdownSheet('conditionDropDown', dropdownData.condition);
                addDropdownSheet('tagDropDown', dropdownData.tag);

                // Apply data validation for the category column
                worksheet.dataValidations.add('A2:A9999', {
                    type: 'list',
                    formulae: [`"${dropdownData.category.join(', ')}"`],
                });

                // Apply cascading data validation for subcategories
                worksheet.dataValidations.add('B2:B9999', {
                    type: 'list',
                    formulae: ['INDIRECT(A2 & "!A:A")'],
                    allowBlank: true,
                });

                // Apply data validation for other dropdown columns
                const dataValidations = [
                    { range: 'E2:E9999', formula: `vendorDropDown!$A$1:$A$${dropdownData.vendor.length}` },
                    { range: 'J2:J9999', formula: `locationDropDown!$A$1:$A$${dropdownData.location.length}` },
                    { range: 'K2:K9999', formula: `conditionDropDown!$A$1:$A$${dropdownData.condition.length}` },
                    { range: 'L2:L9999', formula: `tagDropDown!$A$1:$A$${dropdownData.tag.length}` },
                ];

                dataValidations.forEach(({ range, formula }) => {
                    worksheet.dataValidations.add(range, {
                        type: 'list',
                        allowBlank: true,
                        formulae: [formula],
                    });
                });
            }
            else {

                worksheet.columns = excelDownloadHeader;
                // const imageId = workbook.addImage({
                //     filename: path.join(__dirname, "../..", 'associate.png'), // Path to your PNG image
                //     extension: 'png',
                // });
                // for bold text header row
                worksheet.getRow(1).eachCell((cell) => {
                    cell.font = { bold: true };
                });

                // if many data then add all row 
                if (data?.length > 0) {
                    data.forEach((val, index) => {
                        const row = worksheet.addRow(val);

                        // const rowIndex = index + 2;

                        // // Add image and name to the C column
                        // const nameCell = row.getCell('C');
                        // nameCell.value = val.name;

                        // if (val?.associate?.length > 0) {
                        //     worksheet.addImage(imageId, {
                        //         tl: { col: 2, row: rowIndex - 1 }, // Position for the image in the C column
                        //         ext: { width: 20, height: 20 }, // Adjust width and height as needed
                        //     });
                        //     worksheet.getCell(rowIndex, 3).alignment = { vertical: 'middle', horizontal: 'left' };
                        // }


                        // Apply color to the tag cell
                        const tagCell = row.getCell('L'); // Assuming 'Tag' is column L
                        if (val?.tagColor) {
                            tagCell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: val?.tagColor },
                            };
                            tagCell.font = {
                                color: { argb: 'FFFFFF' }, // White text color for contrast
                                bold: true, // Optional: make the text bold
                            };
                        }


                        // Apply color to the Status cell
                        const statusCell = row.getCell('N'); // Assuming 'Status' is column N

                        if (statusCell.value) {
                            let fillColor;

                            switch (statusCell.value) {
                                case 'Available':
                                    fillColor = '60b158'; // Green
                                    break;
                                case 'Unavailable':
                                    fillColor = 'ff6961'; // Red
                                    break;
                                case 'Assigned':
                                    fillColor = 'ffa700'; // Yellow
                                    break;
                                case 'Associate':
                                    fillColor = '007aff'; // Blue
                                    break;
                                default:
                                    fillColor = 'FFFFFF'; // White (default)
                                    break;
                            }

                            statusCell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: fillColor },
                            };
                            statusCell.font = {
                                color: { argb: 'FFFFFF' }, // White text color
                                bold: true, // Optional: make the text bold
                            };
                        }
                    });
                }


            }

            // Return the workbook
            return resolve(workbook);
        } catch (error) {
            console.log("createExcel error", error);
            return reject(error)
        }
    })
};

const downloadSample = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            // const data = await Asset.findOne({ isActive: true, isDeleted: false }).select("-files").populate([
            //     {
            //         path: "category",
            //         select: "name"
            //     },
            //     {
            //         path: "vendor",
            //         select: "name"
            //     },
            //     {
            //         path: "location",
            //         select: "name"
            //     },
            //     {
            //         path: "condition",
            //         select: "name"
            //     },
            // ]).lean()
            // if (data) {

            //     // Override populated keys with their names
            //     data.category = data.category ? data.category.name : "";
            //     data.vendor = data.vendor ? data.vendor.name : "";
            //     data.location = data.location ? data.location.name : "";
            //     data.condition = data.condition ? data.condition.name : "";
            //     if (data.expireDateWarranty) {
            //         data.expireDateWarranty = moment(data.expireDateWarranty).format('DD-MM-YYYY');
            //     }
            //     if (data.purchasedOn) {
            //         data.purchasedOn = moment(data.purchasedOn).format('DD-MM-YYYY');
            //     }
            // }



            // res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

            // const fileName = moment().format("DD-MM-YYYY_H-mm-ss")
            // res.setHeader('Content-Disposition', `attachment; filename=Asset Insert_${name}.xlsx`);

            const fileName = `Asset_Sample_${moment().format("DD-MM-YYYY_H-mm-ss")}.xlsx`
            const filePath = path.join(importDir, fileName)
            if (!fs.existsSync(filePath)) {
                const workbook = await createExcelWithDropdown([], isDropDown = true);

                if (workbook) {
                    await workbook?.xlsx?.writeFile(filePath);
                    await excelQueue.add("excelTask", { filePath });
                    return resolve({ fileName, filePath, });
                }
            }

        } catch (error) {
            console.log("downloadSample Error", error);
            return resolve({ status: HTTP?.INTERNAL_SERVER, mesaage: "An error occurred while generating the Excel file." });
        }
    })
};

const downloadError = async (clientData) => {

    return new Promise(async (resolve, reject) => {
        try {
            // fetch data from redis
            // const errDataExcel = JSON.parse(await redis.get(clientData?._id));
            const errDataExcel = JSON.parse(await redis.get("669a386f145000259e19e4e0"));

            // if not found then expired data
            if (!errDataExcel) {
                // return resolve(res.status(HTTP?.BAD_REQ).json({ status: HTTP?.BAD_REQ, message: "Download error data expired" }));
                return resolve({ status: HTTP?.BAD_REQ, message: "Download error data expired" });
            }

            // fetch data from db
            const [categoryData, subCategoryData, assetData, locationData, vendorData, conditionData, tagData] = await Promise.all([
                Category.find({ isActive: true, isDeleted: false }).select('name _id'),
                SubCategory.find({ isActive: true, isDeleted: false }).select('name category _id'),
                Asset.find({ isActive: true, isDeleted: false }).select('name _id assetId'),
                Location.find({ isActive: true, isDeleted: false }).select('name _id'),
                Vendor.find({ isActive: true, isDeleted: false }).select('name _id'),
                Condition.find({ isActive: true, isDeleted: false }).select('name _id'),
                Tag.find({ isActive: true, isDeleted: false }).select('name _id')
            ]);

            // mapping id to name
            const categoryMap = createIdNameMap(categoryData);
            const subCategoryMap = createIdNameMap(subCategoryData);
            const locationMap = createIdNameMap(locationData);
            const vendorMap = createIdNameMap(vendorData);
            const conditionMap = createIdNameMap(conditionData);
            const tagMap = createIdNameMap(tagData);

            // mapping id to assetId
            const assetMap = createIdAssetIDMap(assetData);

            const errData = errDataExcel.map(({ val }) => {
                const dbData = {};

                // field mapping in errData
                Object.keys(val).forEach(key => {
                    const dbKey = fieldMapping[key] || key;
                    dbData[dbKey] = val[key];
                });

                Object.keys(dbData).forEach(key => {
                    switch (key) {
                        case "category":
                            dbData[key] = categoryMap[dbData[key]] || dbData[key];
                            break;
                        case "subCategory":
                            dbData[key] = subCategoryMap[dbData[key]] || dbData[key];
                            break;
                        case "assetId":
                            dbData[key] = assetMap[dbData[key]] || dbData[key];
                            break;
                        case "location":
                            dbData[key] = locationMap[dbData[key]] || dbData[key];
                            break;
                        case "vendor":
                            dbData[key] = vendorMap[dbData[key]] || dbData[key];
                            break;
                        case "condition":
                            dbData[key] = conditionMap[dbData[key]] || dbData[key];
                            break;
                        case "tag":
                            dbData[key] = tagMap[dbData[key]] || dbData[key];
                            break;
                    }
                });

                return dbData;
            });


            // create excel for errData
            const fileName = `Error_Assets_${moment().format("DD-MM-YYYY_H-mm-ss")}.xlsx`
            const filePath = path.join(importDir, fileName)

            const workbook = await createExcelWithDropdown(errData, isDropDown = true);
            if (workbook) {
                await workbook.xlsx.writeFile(filePath);
                await excelQueue.add("excelTask", { filePath });

                return resolve({ fileName, filePath });
            }

            // await redis.del("669a386f145000259e19e4e0");
            // await redis.del(clientData?._id);

            // setTimeout(() => {
            //     if (filePath) {
            //         fs.unlinkSync(filePath);
            //     }
            // }, 60000);
        } catch (error) {
            console.error('Error:', error);
            // return resolve(res.status(HTTP?.INTERNAL_SERVER).json({ status: HTTP?.INTERNAL_SERVER, message: "An error occurred while generating the Excel file." }));
            return resolve({ status: HTTP?.INTERNAL_SERVER, message: "An error occurred while generating the Excel file." });

        }
    })
};

const dwonloadAssetExcel = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            let data = await Asset.find({ isActive: true, isDeleted: false }).select("-files").populate([
                {
                    path: "category",
                    select: "name"
                },
                {
                    path: "subCategory",
                    select: "name"
                },
                {
                    path: "vendor",
                    select: "name"
                },
                {
                    path: "location",
                    select: "name"
                },
                {
                    path: "condition",
                    select: "name"
                },
                {
                    path: "tag",
                    select: "name color"
                },
                {
                    path: "assignTo",
                    select: "name"
                },
                {
                    path: "createdBy",
                    select: "name"
                },
                {
                    path: "assignBy",
                    select: "name"
                },
                {
                    path: "associate",
                    select: "assetId"
                },
                {
                    path: "assignAssets",
                    select: "assetId"
                },
            ]).lean()
            if (data) {
                // Override populated keys with their names
                data.forEach(data => {
                    data.category = data?.category ? data?.category?.name : "";
                    data.subCategory = data?.subCategory ? data?.subCategory?.name : "";
                    data.vendor = data?.vendor ? data.vendor?.name : "";
                    data.location = data?.location ? data?.location?.name : "";
                    data.condition = data?.condition ? data?.condition?.name : "";
                    data.tagColor = data?.tag ? data?.tag?.color?.replace("#", '') : "";
                    data.tag = data?.tag ? data?.tag?.name : "";
                    data.status = data?.status == assetStatus?.available ? "Available" : data?.status == assetStatus?.unavailable ? "Unavailble" : data?.status == assetStatus?.assign ? "Assigned" : "Associate"
                    data.assignTo = data?.assignTo ? data?.assignTo?.name : "";
                    data.assignBy = data?.assignBy ? data?.assignBy?.name : "";
                    data.assignAssets = data?.assignAssets ? data?.assignAssets?.assetId : "";
                    data.associate = data?.associate?.map(asset => asset?.assetId).join(",");
                    data.isImport = data?.isImport ? "Yes" : "No";
                    data.createdBy = data?.createdBy ? data?.createdBy?.name : "";
                    if (data?.expireDateWarranty) {
                        data.expireDateWarranty = moment(data?.expireDateWarranty).format('DD-MM-YYYY');
                    }
                    if (data.purchasedOn) {
                        data.purchasedOn = moment(data?.purchasedOn).format('DD-MM-YYYY');
                    }
                    if (data?.lastAuditDate) {
                        data.lastAuditDate = moment(data?.lastAuditDate).format('DD-MM-YYYY');
                    }
                    if (data?.assignAt) {
                        data.assignAt = moment(data?.assignAt).format('DD-MM-YYYY');
                    }
                })
            }


            const fileName = `Asset_List_${moment().format("DD-MM-YYYY_H-mm-ss")}.xlsx`
            const filePath = path.join(importDir, fileName)
            if (!fs.existsSync(filePath)) {
                const workbook = await createExcelWithDropdown(data, isDropDown = false);
                if (workbook) {
                    await workbook.xlsx.writeFile(filePath);
                    await excelQueue.add("excelTask", { filePath }, { delay: 10000 });
                    return resolve({ fileName, filePath, });
                }
            }

        } catch (error) {
            console.log("downloadAsset Error", error);
            return resolve({ status: HTTP?.INTERNAL_SERVER, mesaage: "An error occurred while generating the Excel file." });
        }
    })
}

// const importAsset = async (req, res) => {
//     return new Promise(async (resolve, reject) => {
//         try {

//             if (!req.file) {
//                 return resolve(res.status(HTTP?.BAD_REQ).json({ status: HTTP?.BAD_REQ, message: "No file uploaded." }));
//             }

//             // Create a new Excel workbook
//             const workbook = new ExcelJS.Workbook();
//             await workbook.xlsx.readFile(path.join(req.file.path));

//             // required headers
//             const requiredHeader = ['Category', 'Asset ID', 'Asset Name'];

//             const headers = {};
//             const data = [];
//             const missingHeaders = [];

//             // finding data
//             const [categoryData, assetData, locationData, vendorData, conditionData, tagData] = await Promise.all([
//                 Category.find({ isActive: true, isDeleted: false }).select('name _id'),
//                 Asset.find({ isActive: true, isDeleted: false }).select('assetId _id category'),
//                 Location.find({ isActive: true, isDeleted: false }).select('name _id'),
//                 Vendor.find({ isActive: true, isDeleted: false }).select('name _id'),
//                 Condition.find({ isActive: true, isDeleted: false }).select('name _id'),
//                 Tag.find({ isActive: true, isDeleted: false }).select('name _id'),
//             ]);

//             // mapping name with Id
//             const categoryMap = createNameIdMap(categoryData);
//             const locationMap = createNameIdMap(locationData);
//             const vendorMap = createNameIdMap(vendorData);
//             const conditionMap = createNameIdMap(conditionData);
//             const tagMap = createNameIdMap(tagData);

//             workbook.worksheets.forEach((worksheet) => {

//                 // other dropdown sheet hidden
//                 if (worksheet.state != "hidden") {

//                     worksheet.eachRow((row, rowNumber) => {

//                         // Capture the header row
//                         if (rowNumber === 1) {

//                             row.eachCell((cell, colNumber) => {
//                                 headers[colNumber] = cell?.value;
//                             });
//                             const headerValues = Object.values(headers);
//                             requiredHeader.forEach(item => {
//                                 if (!headerValues.includes(item)) {
//                                     missingHeaders.push(item)
//                                 }
//                             });
//                         } else {

//                             // Capture the data rows
//                             const rowData = {};
//                             let rowCategoryId = null; // To store the category ID in the current row
//                             let rowAssetId = null; // To store the asset ID in the current row

//                             row.eachCell((cell, colNumber) => {
//                                 let cellValue = cell?.value

//                                 // header in category value
//                                 if (headers[colNumber] === 'Category') {
//                                     cellValue = categoryMap[cellValue] || cellValue;
//                                     rowCategoryId = cellValue
//                                 }

//                                 // header in location value
//                                 if (headers[colNumber] === 'Location') {
//                                     cellValue = locationMap[cellValue] || cellValue;
//                                 }

//                                 // header in vendor value
//                                 if (headers[colNumber] === 'Vendor Name') {
//                                     cellValue = vendorMap[cellValue] || cellValue;
//                                 }

//                                 // header in asset id value
//                                 if (headers[colNumber] === 'Asset ID') {
//                                     // cellValue = assetMap[cellValue] || cellValue;
//                                     rowAssetId = cellValue
//                                     if (rowCategoryId && rowAssetId) {
//                                         const asset = assetData.find(asset =>
//                                             asset?.assetId === rowAssetId &&
//                                             asset?.category?.toString() === rowCategoryId?.toString()
//                                         );
//                                         cellValue = asset ? asset?._id : rowAssetId;
//                                     }
//                                 }

//                                 // header in condition value
//                                 if (headers[colNumber] === 'Condition') {
//                                     cellValue = conditionMap[cellValue] || cellValue;
//                                 }

//                                 // header in tag value
//                                 if (headers[colNumber] === 'Tag') {
//                                     cellValue = tagMap[cellValue] || cellValue;
//                                 }

//                                 // other value same at it is
//                                 rowData[headers[colNumber]] = cellValue;
//                             });

//                             // that row push in data array
//                             data.push(rowData);
//                         }
//                     });
//                 }
//             })

//             // if no data in sheet
//             if (data?.length == 0) {
//                 return resolve(res.status(HTTP?.BAD_REQ).json({ status: HTTP?.BAD_REQ, message: "There are no data in sheet" }));
//             }

//             // if any missing header
//             if (missingHeaders?.length > 0) {
//                 return resolve(res.status(HTTP?.BAD_REQ).json({ status: HTTP?.BAD_REQ, message: `Missing required headers: ${missingHeaders.join(', ')}` }));
//             }

//             // if duplicate data in sheet then store this
//             const uniqueEntries = new Set();
//             const finalArray = [];
//             const errData = [];

//             const importData = {
//                 importBy: req?.clientData?._id,
//                 fileName: req?.file?.filename,
//                 fileURL: path.join(importDir, req?.file?.filename),
//                 createdBy: req?.clientData?._id
//             }

//             data?.forEach((val, index) => {
//                 const errorDetails = {
//                     index,
//                     val,
//                     err: {}
//                 };

//                 // field mapping value change in dbData
//                 const dbData = {};
//                 Object.keys(val)?.forEach(dataKey => {
//                     const dbKey = fieldMapping[dataKey] || dataKey;
//                     dbData[dbKey] = val[dataKey];
//                 });

//                 // Process each dbData key
//                 Object.keys(dbData)?.forEach(dataKey => {
//                     let errorKey = "";
//                     switch (dataKey) {
//                         case 'category':
//                             if (dbData[dataKey] && ObjectId.isValid(dbData[dataKey])) {
//                                 dbData[dataKey] = dbData[dataKey].toString();
//                             } else {
//                                 errorKey = 'Invalid Category';
//                             }
//                             break;

//                         case 'location':
//                             if (!dbData[dataKey] || ObjectId.isValid(dbData[dataKey])) {
//                                 dbData[dataKey] = dbData[dataKey]?.toString();
//                             } else {
//                                 errorKey = 'Invalid Location';
//                             }
//                             break;

//                         case 'vendor':
//                             if (!dbData[dataKey] || ObjectId.isValid(dbData[dataKey])) {
//                                 dbData[dataKey] = dbData[dataKey]?.toString();
//                             } else {
//                                 errorKey = 'Invalid Vendor';
//                             }
//                             break;

//                         case 'condition':
//                             if (!dbData[dataKey] || ObjectId.isValid(dbData[dataKey])) {
//                                 dbData[dataKey] = dbData[dataKey]?.toString();
//                             } else {
//                                 errorKey = 'Invalid Condition';
//                             }
//                             break;

//                         case 'tag':
//                             if (!dbData[dataKey] || ObjectId.isValid(dbData[dataKey])) {
//                                 dbData[dataKey] = dbData[dataKey]?.toString();
//                             } else {
//                                 errorKey = 'Invalid Tag';
//                             }
//                             break;

//                         case 'assetId':
//                             if (dbData[dataKey] && ObjectId.isValid(dbData[dataKey])) {
//                                 errorKey = 'Asset ID already existing';
//                             }
//                             break;

//                         case 'purchasedOn':
//                             if (!dbData[dataKey] || isValidDate(dbData[dataKey])) {
//                                 dbData[dataKey] = moment(dbData[dataKey], 'DD-MM-YYYY').startOf('day').toISOString();
//                             } else {
//                                 errorKey = 'Invalid Purchase Date';
//                             }
//                             break;

//                         case 'expireDateWarranty':
//                             if (!dbData[dataKey] || isValidDate(dbData[dataKey])) {
//                                 dbData[dataKey] = moment(dbData[dataKey], 'DD-MM-YYYY').startOf('day').toISOString();
//                             } else {
//                                 errorKey = 'Invalid Expired Date';
//                             }
//                             break;
//                         case 'price':
//                             if (!dbData[dataKey] || /^[0-9]+$/.test(dbData[dataKey])) {
//                                 dbData[dataKey] = dbData[dataKey];
//                             } else {
//                                 errorKey = 'Invalid Price';
//                             }
//                             break;
//                         default:
//                             // Handle unknown keys
//                             break;
//                     }

//                     // If there's an error for the current key, add it to errorDetails
//                     if (errorKey) {
//                         errorDetails.err[dataKey] = errorKey;
//                     }
//                 });


//                 // additional validations outside the switch case
//                 const purchasedOnDate = dbData['purchasedOn'] ? parseDate(dbData['purchasedOn']) : null;
//                 const expireDateWarranty = dbData['expireDateWarranty'] ? parseDate(dbData['expireDateWarranty']) : null;

//                 const isExpiredBeforePurchased = purchasedOnDate && expireDateWarranty && expireDateWarranty < purchasedOnDate;

//                 // Apply additional validations
//                 if (isExpiredBeforePurchased) {
//                     errorDetails.err.expiredsDate = "Expired Date cannot be before Purchased Date";
//                 }

//                 // Add to errData if there are any errors
//                 if (Object.keys(errorDetails?.err)?.length > 0) {
//                     errData.push(errorDetails);
//                 } else {
//                     // No errors, proceed with duplicated data
//                     const key = getUniqueKey(dbData);
//                     if (uniqueEntries.has(key)) {
//                         errData.push({
//                             index,
//                             val: dbData,
//                             err: {
//                                 general: "Duplicate Data"
//                             }
//                         });
//                     } else {
//                         // no duplicate data then push finalArray
//                         finalArray.push({ val: dbData });
//                         uniqueEntries.add(key);
//                     }
//                 }
//             });

//             // finalArray to add in db
//             if (finalArray?.length > 0) {

//                 // finalArray each item to save in db
//                 const results = await Promise.allSettled(finalArray.map((item, index) => {
//                     item.val.isImport = true;
//                    return addAssets(item.val, req?.clientData);
//                 }));

//                 // if any reject then that index and reject message
//                 const rejectedIndexes = results
//                     .map((result, index) => result?.status === "rejected" ? { index, message: result?.reason?.message } : -1)
//                     .filter(index => index !== -1);

//                 // rejectdata push into failed items
//                 if (rejectedIndexes?.length > 0) {
//                     const failedItems = [];
//                     rejectedIndexes?.forEach(({ index, message }) => {
//                         failedItems.push({ val: finalArray[index]?.val, message });
//                     })

//                     // failed item push into errdata and remove from finalArray
//                     if (failedItems?.length > 0) {
//                         failedItems?.forEach(({ val, message }) => {
//                             const joiErrorKeyMatch = message?.match(/"([^"]+)"/);  // joi validation then that message convert to proper message
//                             const errorKey = joiErrorKeyMatch ? joiErrorKeyMatch[1] : "general";
//                             const errorMessage = joiErrorKeyMatch ? `${joiErrorKeyMatch[1]} ${message.split(" ").slice(1).join(" ")}` : message;
//                             const errorDetails = {
//                                 val,
//                                 err: {
//                                     [errorKey]: errorMessage
//                                 }
//                             };
//                             errData.push(errorDetails);
//                             finalArray.splice(finalArray.indexOf({ val }), 1);
//                         })
//                     }
//                 }
//             }

//             // err data store into redis for create excel
//             if (errData?.length > 0) {
//                 const errorData = errData.map(({ index, val, err }) => {
//                     const errorDetails = {
//                         index,
//                         val: {},
//                         err: {}
//                     };

//                     // map value
//                     Object.keys(val).forEach(key => {
//                         const dataKey = errFieldMapping[key] || key;
//                         errorDetails.val[dataKey] = val[key];
//                     });

//                     // map err
//                     Object.keys(err).forEach(key => {
//                         const dataKey = errFieldMapping[key] || key;
//                         errorDetails.err[dataKey] = err[key];
//                     })

//                     return errorDetails;
//                 });

//                 if (errorData?.length > 0) {
//                     // err data store into redis
//                     await redis.set(req?.clientData?._id, JSON.stringify(errorData), "EX", 120);
//                 }
//                 if (finalArray?.length > 0) {
//                     importData.status = 2;
//                     importData.finalData = [finalArray, errorData];
//                     await importAssetData(importData);
//                     return resolve(res.status(HTTP?.SUCCESS).json({ finalArray, message: "Asset Add Successfully", errorData }));
//                 }
//                 importData.status = 1;
//                 importData.finalData = [errorData];
//                 await importAssetData(importData);
//                 return resolve(res.status(HTTP?.BAD_REQ).json({ finalArray, errorData }));
//             }

//             importData.status = 3;
//             importData.finalData = [finalArray];
//             await importAssetData(importData);
//             return resolve(res.status(HTTP?.SUCCESS).json({ finalArray, message: "Asset Add Successfully" }));

//         } catch (error) {
//             console.log("importAsset Error", error);
//             return resolve(res.status(HTTP?.INTERNAL_SERVER).json({ status: HTTP?.INTERNAL_SERVER, message: "An error occurred while importing the Excel file." }));
//         } finally {
//             console.log(req.file);
//             if (req?.file) {
//                 fs?.unlinkSync(req?.file?.path);
//             }
//         }
//     })
// }

const importAsset = async (req, res) => {
    try {

        if (!req.file) {
            return res.status(HTTP?.BAD_REQ).json({ status: HTTP?.BAD_REQ, message: "No file uploaded." });
        }

        // Create a new Excel workbook
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(path.join(req.file.path));

        // required headers
        const requiredHeader = ['Category', 'Sub Category', 'Asset ID', 'Asset Name'];

        const headers = {};
        const data = [];
        const missingHeaders = [];

        // finding data
        const [categoryData, subCategoryData, assetData, locationData, vendorData, conditionData, tagData] = await Promise.all([
            Category.find({ isActive: true, isDeleted: false }).select('name _id'),
            SubCategory.find({ isActive: true, isDeleted: false }).select('_id name category'),
            Asset.find({ isActive: true, isDeleted: false }).select('assetId _id category subCategory'),
            Location.find({ isActive: true, isDeleted: false }).select('name _id'),
            Vendor.find({ isActive: true, isDeleted: false }).select('name _id'),
            Condition.find({ isActive: true, isDeleted: false }).select('name _id'),
            Tag.find({ isActive: true, isDeleted: false }).select('name _id'),
        ]);

        // mapping name with Id
        const categoryMap = createNameIdMap(categoryData);
        const subCategoryMap = createNameIdMap(subCategoryData);
        const locationMap = createNameIdMap(locationData);
        const vendorMap = createNameIdMap(vendorData);
        const conditionMap = createNameIdMap(conditionData);
        const tagMap = createNameIdMap(tagData);

        workbook.worksheets.forEach((worksheet) => {

            // other dropdown sheet hidden
            if (worksheet.state != "hidden") {

                worksheet.eachRow((row, rowNumber) => {

                    // Capture the header row
                    if (rowNumber === 1) {

                        row.eachCell((cell, colNumber) => {
                            headers[colNumber] = cell?.value;
                        });
                        const headerValues = Object.values(headers);
                        requiredHeader.forEach(item => {
                            if (!headerValues.includes(item)) {
                                missingHeaders.push(item)
                            }
                        });
                    } else {

                        // Capture the data rows
                        const rowData = {};
                        let rowCategoryId = null; // To store the category ID in the current row
                        let rowSubCategoryId = null; // To store the sub category ID in the current row
                        let rowAssetId = null; // To store the asset ID in the current row

                        row.eachCell((cell, colNumber) => {
                            let cellValue = cell?.value

                            // header in category value
                            if (headers[colNumber] === 'Category') {
                                cellValue = categoryMap[cellValue] || cellValue;
                                rowCategoryId = cellValue
                            }

                            // header in sub category value
                            if (headers[colNumber] === 'Sub Category') {
                                cellValue = subCategoryMap[cellValue] || cellValue;
                                rowSubCategoryId = cellValue
                                if (rowCategoryId && rowSubCategoryId) {
                                    const subCat = subCategoryData.find(subCat =>
                                        subCat?._id?.toString() === rowSubCategoryId?.toString() &&
                                        subCat?.category?.toString() === rowCategoryId?.toString()
                                    );
                                    cellValue = subCat ? subCat?._id : rowSubCategoryId;
                                }
                            }

                            // header in location value
                            if (headers[colNumber] === 'Location') {
                                cellValue = locationMap[cellValue] || cellValue;
                            }

                            // header in vendor value
                            if (headers[colNumber] === 'Vendor Name') {
                                cellValue = vendorMap[cellValue] || cellValue;
                            }

                            // header in asset id value
                            if (headers[colNumber] === 'Asset ID') {
                                // cellValue = assetMap[cellValue] || cellValue;
                                rowAssetId = cellValue
                                if (rowCategoryId && rowSubCategoryId && rowAssetId) {
                                    const asset = assetData.find(asset =>
                                        asset?.assetId === rowAssetId &&
                                        asset?.category?.toString() === rowCategoryId?.toString() && asset?.subCategory?.toString() === rowSubCategoryId?.toString()

                                    );
                                    cellValue = asset ? asset?._id : rowAssetId;
                                }
                            }

                            // header in condition value
                            if (headers[colNumber] === 'Condition') {
                                cellValue = conditionMap[cellValue] || cellValue;
                            }

                            // header in tag value
                            if (headers[colNumber] === 'Tag') {
                                cellValue = tagMap[cellValue] || cellValue;
                            }

                            // other value same at it is
                            rowData[headers[colNumber]] = cellValue;
                        });

                        // that row push in data array
                        data.push(rowData);
                    }
                });
            }
        })

        // if no data in sheet
        if (data?.length == 0) {
            return res.status(HTTP?.BAD_REQ).json({ status: HTTP?.BAD_REQ, message: "There are no data in sheet" });
        }

        // if any missing header
        if (missingHeaders?.length > 0) {
            return res.status(HTTP?.BAD_REQ).json({ status: HTTP?.BAD_REQ, message: `Missing required headers: ${missingHeaders.join(', ')}` });
        }

        // if duplicate data in sheet then store this
        const uniqueEntries = new Set();
        const finalArray = [];
        const errData = [];

        const importData = {
            importBy: req?.clientData?._id,
            fileName: req?.file?.filename,
            fileURL: path.join(importDir, req?.file?.filename),
            createdBy: req?.clientData?._id
        }

        data?.forEach((val, index) => {
            const errorDetails = {
                index,
                val,
                err: {}
            };

            // field mapping value change in dbData
            const dbData = {};
            Object.keys(val)?.forEach(dataKey => {
                const dbKey = fieldMapping[dataKey] || dataKey;
                dbData[dbKey] = val[dataKey];
            });

            // Process each dbData key
            Object.keys(dbData)?.forEach(dataKey => {
                let errorKey = "";
                switch (dataKey) {
                    case 'category':
                        if (dbData[dataKey] && ObjectId.isValid(dbData[dataKey])) {
                            dbData[dataKey] = dbData[dataKey].toString();
                        } else {
                            errorKey = 'Invalid Category';
                        }
                        break;

                    case 'subCategory':
                        if (dbData[dataKey] && ObjectId.isValid(dbData[dataKey])) {
                            dbData[dataKey] = dbData[dataKey].toString();
                        } else {
                            errorKey = 'Invalid Sub Category';
                        }
                        break;

                    case 'location':
                        if (!dbData[dataKey] || ObjectId.isValid(dbData[dataKey])) {
                            dbData[dataKey] = dbData[dataKey]?.toString();
                        } else {
                            errorKey = 'Invalid Location';
                        }
                        break;

                    case 'vendor':
                        if (!dbData[dataKey] || ObjectId.isValid(dbData[dataKey])) {
                            dbData[dataKey] = dbData[dataKey]?.toString();
                        } else {
                            errorKey = 'Invalid Vendor';
                        }
                        break;

                    case 'condition':
                        if (!dbData[dataKey] || ObjectId.isValid(dbData[dataKey])) {
                            dbData[dataKey] = dbData[dataKey]?.toString();
                        } else {
                            errorKey = 'Invalid Condition';
                        }
                        break;

                    case 'tag':
                        if (!dbData[dataKey] || ObjectId.isValid(dbData[dataKey])) {
                            dbData[dataKey] = dbData[dataKey]?.toString();
                        } else {
                            errorKey = 'Invalid Tag';
                        }
                        break;

                    case 'assetId':
                        if (dbData[dataKey] && ObjectId.isValid(dbData[dataKey])) {
                            errorKey = 'Asset ID already existing';
                        }
                        break;

                    case 'purchasedOn':
                        if (!dbData[dataKey] || isValidDate(dbData[dataKey])) {
                            dbData[dataKey] = moment(dbData[dataKey], 'DD-MM-YYYY').startOf('day').toISOString();
                        } else {
                            errorKey = 'Invalid Purchase Date';
                        }
                        break;

                    case 'expireDateWarranty':
                        if (!dbData[dataKey] || isValidDate(dbData[dataKey])) {
                            dbData[dataKey] = moment(dbData[dataKey], 'DD-MM-YYYY').startOf('day').toISOString();
                        } else {
                            errorKey = 'Invalid Expired Date';
                        }
                        break;
                    case 'lastAuditDate':
                        if (!dbData[dataKey] || isValidDate(dbData[dataKey])) {
                            dbData[dataKey] = moment(dbData[dataKey], 'DD-MM-YYYY').startOf('day').toISOString();
                        } else {
                            errorKey = 'Invalid Last Audit Date';
                        }
                        break;
                    case 'price':
                        if (!dbData[dataKey] || /^[0-9]+$/.test(dbData[dataKey])) {
                            dbData[dataKey] = dbData[dataKey];
                        } else {
                            errorKey = 'Invalid Price';
                        }
                        break;
                    default:
                        // Handle unknown keys
                        break;
                }

                // If there's an error for the current key, add it to errorDetails
                if (errorKey) {
                    errorDetails.err[dataKey] = errorKey;
                }
            });


            // additional validations outside the switch case
            const purchasedOnDate = dbData['purchasedOn'] ? parseDate(dbData['purchasedOn']) : null;
            const expireDateWarranty = dbData['expireDateWarranty'] ? parseDate(dbData['expireDateWarranty']) : null;
            const lastAuditDate = dbData['lastAuditDate'] ? parseDate(dbData['lastAuditDate']) : null;

            const isExpiredBeforePurchased = purchasedOnDate && expireDateWarranty && expireDateWarranty < purchasedOnDate;
            const isLastAuditBeforePurchased = purchasedOnDate && lastAuditDate && lastAuditDate < purchasedOnDate;

            // Apply additional validations
            if (isExpiredBeforePurchased) {
                errorDetails.err.expiredDate = "Expired Date cannot be before Purchased Date";
            }

            // Apply additional validations
            if (isLastAuditBeforePurchased) {
                errorDetails.err.lastAuditDate = "Last Audit Date cannot be before Purchased Date";
            }

            // Add to errData if there are any errors
            if (Object.keys(errorDetails?.err)?.length > 0) {
                errData.push(errorDetails);
            } else {
                // No errors, proceed with duplicated data
                const key = getUniqueKey(dbData);
                if (uniqueEntries.has(key)) {
                    errData.push({
                        index,
                        val: dbData,
                        err: {
                            general: "Duplicate Data"
                        }
                    });
                } else {
                    // no duplicate data then push finalArray
                    finalArray.push({ val: dbData });
                    uniqueEntries.add(key);
                }
            }
        });

        // finalArray to add in db
        if (finalArray?.length > 0) {

            // finalArray each item to save in db
            const results = await Promise.allSettled(finalArray.map((item, index) => {
                item.val.isImport = true;
                return addAssets(item.val, req?.clientData);
            }));

            // if any reject then that index and reject message
            const rejectedIndexes = results
                .map((result, index) => result?.status === "rejected" ? { index, message: result?.reason?.message } : -1)
                .filter(index => index !== -1);

            // rejectdata push into failed items
            if (rejectedIndexes?.length > 0) {
                const failedItems = [];
                rejectedIndexes?.forEach(({ index, message }) => {
                    failedItems.push({ val: finalArray[index]?.val, message });
                })

                // failed item push into errdata and remove from finalArray
                if (failedItems?.length > 0) {
                    failedItems?.forEach(({ val, message }) => {
                        const joiErrorKeyMatch = message?.match(/"([^"]+)"/);  // joi validation then that message convert to proper message
                        const errorKey = joiErrorKeyMatch ? joiErrorKeyMatch[1] : "general";
                        const errorMessage = joiErrorKeyMatch ? `${joiErrorKeyMatch[1]} ${message.split(" ").slice(1).join(" ")}` : message;
                        const errorDetails = {
                            val,
                            err: {
                                [errorKey]: errorMessage
                            }
                        };
                        errData.push(errorDetails);
                        finalArray.splice(finalArray.indexOf({ val }), 1);
                    })
                }
            }
        }

        // err data store into redis for create excel
        if (errData?.length > 0) {
            const errorData = errData.map(({ index, val, err }) => {
                const errorDetails = {
                    index,
                    val: {},
                    err: {}
                };

                // map value
                Object.keys(val).forEach(key => {
                    const dataKey = errFieldMapping[key] || key;
                    errorDetails.val[dataKey] = val[key];
                });

                // map err
                Object.keys(err).forEach(key => {
                    const dataKey = errFieldMapping[key] || key;
                    errorDetails.err[dataKey] = err[key];
                })

                return errorDetails;
            });

            if (errorData?.length > 0) {
                // err data store into redis
                await redis.set(req?.clientData?._id, JSON.stringify(errorData), "EX", 120);
            }
            if (finalArray?.length > 0) {
                importData.status = 2;
                importData.finalData = [finalArray, errorData];
                await importAssetData(importData);
                return res.status(HTTP?.SUCCESS).json({ finalArray, message: "Asset Add Successfully", errorData });
            }
            importData.status = 1;
            importData.finalData = [errorData];
            await importAssetData(importData);
            return res.status(HTTP?.BAD_REQ).json({ finalArray, errorData });
        }

        importData.status = 3;
        importData.finalData = [finalArray];
        await importAssetData(importData);
        return res.status(HTTP?.SUCCESS).json({ finalArray, message: "Asset Add Successfully" });
    } catch (error) {
        console.log("importAsset Error", error);
        return res.status(HTTP?.INTERNAL_SERVER).json({ status: HTTP?.INTERNAL_SERVER, message: "An error occurred while importing the Excel file." });
    } finally {
        if (req?.file) {
            fs?.unlinkSync(req?.file?.path);
        }
    }
}


// map using name to id
const createNameIdMap = (data) => {
    const map = {};
    data?.forEach(item => {
        map[item?.name] = item?._id;
    });
    return map;
};

// map using id to assetID
const createIdAssetIDMap = (data) => {
    const map = {};
    data?.forEach(item => {
        map[item?._id] = item?.assetId;
    });
    return map;
};

// map using id to name
const createIdNameMap = (data) => {
    const map = {};
    data?.forEach(item => {
        map[item?._id] = item?.name;
    });
    return map;
};

// unique key for not duplicate data insert int to asset
const getUniqueKey = (item) => `${item?.category}_${item?.subCategory}_${item?.assetId}`;

// validate date for format
const isValidDate = (dateStr) => {
    const datePattern = /^\d{2}-\d{2}-\d{4}$/;
    return datePattern?.test(dateStr);
};

// parse date for extra validate
const parseDate = (dateStr) => {
    const [day, month, year] = dateStr?.split('-').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day);
};

const importAssetData = async ({ finalData, importBy, createdBy, status, fileName, fileURL }) => {
    try {

        let data = finalData?.flat();

        const [categoryData, subCategoryData, assetData, locationData, vendorData, conditionData, tagData] = await Promise.all([
            Category.find({ isActive: true, isDeleted: false }).select('name _id'),
            SubCategory.find({ isActive: true, isDeleted: false }).select('name category _id'),
            Asset.find({ isActive: true, isDeleted: false }).select('assetId _id category subCategory'),
            Location.find({ isActive: true, isDeleted: false }).select('name _id'),
            Vendor.find({ isActive: true, isDeleted: false }).select('name _id'),
            Condition.find({ isActive: true, isDeleted: false }).select('name _id'),
            Tag.find({ isActive: true, isDeleted: false }).select('name _id'),
        ]);

        // mapping id to name
        const categoryMap = createIdNameMap(categoryData);
        const subCategoryMap = createIdNameMap(subCategoryData);
        const locationMap = createIdNameMap(locationData);
        const vendorMap = createIdNameMap(vendorData);
        const conditionMap = createIdNameMap(conditionData);
        const tagMap = createIdNameMap(tagData);

        // mapping id to assetId
        const assetMap = createIdAssetIDMap(assetData);

        data = data?.map(({ val }) => {
            let dbData = {}
            for (const key of Object.keys(val)) {
                const dbKey = fieldMapping[key] || key;
                dbData[dbKey] = val[key];
            }

            for (const key of Object.keys(dbData)) {
                switch (key) {
                    case "category": {
                        if (ObjectId.isValid(dbData[key])) {
                            dbData[key] = categoryMap[dbData[key]]
                        }
                        break;
                    }
                    case "subCategory": {
                        if (ObjectId.isValid(dbData[key])) {
                            dbData[key] = subCategoryMap[dbData[key]]
                        }
                        break;
                    }
                    case "assetId": {
                        if (ObjectId.isValid(dbData[key])) {
                            dbData[key] = assetMap[dbData[key]]
                        }
                        break;
                    }
                    case "vendor": {
                        if (ObjectId.isValid(dbData[key])) {
                            dbData[key] = vendorMap[dbData[key]]
                        }
                        break;
                    }
                    case "location": {
                        if (ObjectId.isValid(dbData[key])) {
                            dbData[key] = locationMap[dbData[key]]
                        }
                        break;
                    }
                    case "condition": {
                        if (ObjectId.isValid(dbData[key])) {
                            dbData[key] = conditionMap[dbData[key]]
                        }
                        break;
                    }
                    case "tag": {
                        if (ObjectId.isValid(dbData[key])) {
                            dbData[key] = tagMap[dbData[key]]
                        }
                        break;
                    }
                    case 'purchasedOn': {
                        const isoFormat = moment(dbData[key], moment.ISO_8601, true);
                        if (isoFormat.isValid()) {
                            // Convert to DD-MM-YYYY format
                            dbData[key] = isoFormat.format('DD-MM-YYYY');
                        } else {
                            dbData[key] = dbData[key]
                        }
                        break;
                    }
                    case 'expireDateWarranty': {
                        const isoFormat = moment(dbData[key], moment.ISO_8601, true);
                        if (isoFormat.isValid()) {
                            // Convert to DD-MM-YYYY format
                            dbData[key] = isoFormat.format('DD-MM-YYYY');
                        }
                        else {
                            dbData[key] = dbData[key]
                        }
                        break;
                    }
                    case 'lastAuditDate': {
                        const isoFormat = moment(dbData[key], moment.ISO_8601, true);
                        if (isoFormat.isValid()) {
                            // Convert to DD-MM-YYYY format
                            dbData[key] = isoFormat.format('DD-MM-YYYY');
                        }
                        else {
                            dbData[key] = dbData[key]
                        }
                        break;
                    }
                }
            }
            return dbData
        });

        console.log("Data::::::::::::>>>>>>>", data);
        const workbook = await createExcelWithDropdown(data);
        await workbook.xlsx.writeFile(fileURL);

        await importAssetModel.create({
            importBy,
            status,
            createdBy,
            fileName,
            fileURL
        })
        return;
    } catch (error) {
        console.error("Error in importAssetData:", error);
        throw error;
    }

}


module.exports = {
    downloadSample,
    importAsset,
    downloadError,
    dwonloadAssetExcel
};
