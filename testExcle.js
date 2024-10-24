
/* -------------------------------------------------------------------------- */
/*                                   proper                                   */
/* -------------------------------------------------------------------------- */


// const ExcelJS = require('exceljs');

// const countryStateData = {
//     "USA": ["California", "New York", "Texas"],
//     "Canada": ["Ontario", "Quebec", "British Columbia"],
//     "Mexico": ["Mexico City", "Guadalajara", "Monterrey"]
// };

// async function createExcelWithDependentDropdown() {

//     const workbook = new ExcelJS.Workbook();
//     const mainSheet = workbook.addWorksheet('Main');
//     const stateSheet = workbook.addWorksheet('StateList');

//     // Set up data validation for Country column (A) in main sheet
//     mainSheet.getCell('A1').value = 'Country';
//     for (let i = 2; i <= 10; i++) {
//         mainSheet.getCell(`A${i}`).dataValidation = {
//             type: 'list',
//             allowBlank: true,
//             formulae: ['"USA,Canada,Mexico"']
//         };
//     }

//     // Create a table with state options in state sheet
//     let row = 1;
//     for (const country in countryStateData) {
//         const states = countryStateData[country];
//         stateSheet.getCell(`A${row}`).value = country;
//         stateSheet.getCell(`B${row}`).value = states.join(',');
//         row++;
//     }

//     // Set up data validation for State column (B) in main sheet
//     mainSheet.getCell('B1').value = 'State';
//     for (let i = 2; i <= 10; i++) {
//         mainSheet.getCell(`B${i}`).dataValidation = {
//             type: 'list',
//             allowBlank: true,
//             formulae: [`=INDEX(StateList!B:B, MATCH(A${i}, StateList!A:A, 0))`]
//         };
//     }

//     // Hide the state sheet
//     stateSheet.state = 'visible';

//     // Save the workbook
//     await workbook.xlsx.writeFile('dependent-dropdown.xlsx');
// }

// createExcelWithDependentDropdown().catch(console.error);





/* -------------------------------------------------------------------------- */
/*                     Main Code Dependent Single DropDown                    */
/* -------------------------------------------------------------------------- */


// const ExcelJS = require('exceljs');
// const path = require("path")

// const countryStateData = {
//     "India": ["Gujarat", "Delhi", "Banglore", "Chennai"],
//     "USA": ["California", "New York", "Texas"],
//     "Canada": ["Ontario", "Quebec", "British Columbia"],
//     "Mexico": ["Mexico City", "Guadalajara", "Monterrey"]
// };
// async function createExcelWithDependentDropdown() {

//     const workbook = new ExcelJS.Workbook();
//     const mainSheet = workbook.addWorksheet('Main');

//     // Create a sheet for each country
//     const countrySheets = {};
//     for (const country in countryStateData) {
//         countrySheets[country] = workbook.addWorksheet(country);
//         const states = countryStateData[country];
//         for (let i = 0; i < states.length; i++) {
//             countrySheets[country].getCell(`A${i + 1}`).value = states[i];
//         }
//     }

//     // Set up data validation for Country column (A) in main sheet
//     mainSheet.getCell('A1').value = 'Country';
//     for (let i = 2; i <= 10; i++) {
//         mainSheet.getCell(`A${i}`).dataValidation = {
//             type: 'list',
//             allowBlank: true,
//             formulae: ['"USA,Canada,Mexico,India"']
//         };
//     }

//     // Set up data validation for State column (B) in main sheet
//     mainSheet.getCell('B1').value = 'State';
//     for (let i = 2; i <= 10; i++) {
//         mainSheet.getCell(`B${i}`).dataValidation = {
//             type: 'list',
//             allowBlank: true,
//             formulae: [`=INDIRECT(A${i} & "!A:A")`]
//         };
//     }

//     // Save the workbook
//     await workbook.xlsx.writeFile('dependent-dropdown.xlsx');
// }

// createExcelWithDependentDropdown().catch(console.error);



/* -------------------------------------------------------------------------- */
/*                                     VBA                                    */
/* -------------------------------------------------------------------------- */

// const ExcelJS = require('exceljs');

// const countryStateData = {
//     "India": ["Gujarat", "Delhi", "Banglore", "Chennai"],
//     "USA": ["California", "New York", "Texas"],
//     "Canada": ["Ontario", "Quebec", "British Columbia"],
//     "Mexico": ["Mexico City", "Guadalajara", "Monterrey"]
// };

// async function createExcelWithDependentDropdown() {
//     const workbook = new ExcelJS.Workbook();
//     const mainSheet = workbook.addWorksheet('Main');

//     // Create a sheet for each country
//     const countrySheets = {};
//     for (const country in countryStateData) {
//         countrySheets[country] = workbook.addWorksheet(country);
//         const states = countryStateData[country];
//         for (let i = 0; i < states.length; i++) {
//             countrySheets[country].getCell(`A${i + 1}`).value = states[i];
//         }
//     }

//     // Set up data validation for Country column (A) in the main sheet
//     mainSheet.getCell('A1').value = 'Country';
//     for (let i = 2; i <= 10; i++) {
//         mainSheet.getCell(`A${i}`).dataValidation = {
//             type: 'list',
//             allowBlank: true,
//             formulae: [`=Main!A1:A4`] // assuming you have 4 countries
//         };
//     }

//     // Set up data validation for State column (B) in the main sheet
//     mainSheet.getCell('B1').value = 'State';
//     for (let i = 2; i <= 10; i++) {
//         mainSheet.getCell(`B${i}`).dataValidation = {
//             type: 'list',
//             allowBlank: true,
//             formulae: [`${mainSheet.getCell(`A${i}`).value}!A:A`]
//         };
//     }

//     // Add a VBA macro to clear the state value if the country changes
//     const vbaProject = workbook.addVBAProject();
//     const vbaModule = vbaProject.getModules().addModule();
//     vbaModule.name = "CountryStateHandler";
//     vbaModule.code = `
// Private Sub Worksheet_Change(ByVal Target As Range)
//     If Not Intersect(Target, Range("A2:A10")) Is Nothing Then
//         Dim rng As Range
//         For Each rng In Target
//             If rng.Column = 1 And rng.Offset(0, 1).Value <> "" Then
//                 rng.Offset(0, 1).Value = ""
//             End If
//         Next rng
//     End If
// End Sub
// `;

//     // Save the workbook
//     await workbook.xlsx.writeFile('dependent-dropdown.xlsx');
// }

// createExcelWithDependentDropdown().catch(console.error);




/* -------------------------------------------------------------------------- */
/*                       Dependent With Multi Selection                       */
/* -------------------------------------------------------------------------- */
// Create a new Excel workbook with a dependent dropdown with multi selection


// const ExcelJS = require('exceljs');
// const path = require("path")

// const countryStateData = {
//     "India": ["Gujarat", "Delhi", "Banglore", "Chennai"],
//     "USA": ["California", "New York", "Texas"],
//     "Canada": ["Ontario", "Quebec", "British Columbia"],
//     "Mexico": ["Mexico City", "Guadalajara", "Monterrey"]
// };
// async function createExcelWithDependentDropdown() {

//     const workbook = new ExcelJS.Workbook();
//     const mainSheet = workbook.addWorksheet('Main');

//     // Create a sheet for each country
//     const countrySheets = {};
//     for (const country in countryStateData) {
//         countrySheets[country] = workbook.addWorksheet(country);
//         const states = countryStateData[country];
//         for (let i = 0; i < states.length; i++) {
//             countrySheets[country].getCell(`A${i + 1}`).value = states[i];
//         }
//     }

//     // Set up data validation for Country column (A) in main sheet
//     mainSheet.getCell('A1').value = 'Country';
//     for (let i = 2; i <= 10; i++) {
//         mainSheet.getCell(`A${i}`).dataValidation = {
//             type: 'list',
//             allowBlank: true,
//             formulae: ['"USA,Canada,Mexico,India"']
//         };
//     }

//     // Set up data validation for State column (B) in main sheet
//     mainSheet.getCell('B1').value = 'State';
//     for (let i = 2; i <= 10; i++) {
//         mainSheet.getCell(`B${i}`).dataValidation = {
//             type: 'list',
//             allowBlank: true,
//             allowMultiple: true,
//             showCheckbox: true, // Add this to display checkboxes
//             formulae: [`=INDIRECT(A${i} & "!A:A")`]
//         };
//     }
//     mainSheet.getColumn(2).width = 30; // Adjust the width of the State column

//     // Save the workbook
//     await workbook.xlsx.writeFile('dependent-dropdown.xlsx');
// }

// createExcelWithDependentDropdown().catch(console.error);


















// const ExcelJS = require('exceljs');
// const path = require("path")

// const countryStateData = {
//     "India": ["Gujarat", "Delhi", "Banglore", "Chennai"],
//     "USA": ["California", "New York", "Texas"],
//     "Canada": ["Ontario", "Quebec", "British Columbia"],
//     "Mexico": ["Mexico City", "Guadalajara", "Monterrey"]
// };

// async function createExcelWithDependentDropdown() {
//     const workbook = new ExcelJS.Workbook();
//     const mainSheet = workbook.addWorksheet('Main');

//     // Create a sheet for each country
//     const countrySheets = {};
//     for (const country in countryStateData) {
//         countrySheets[country] = workbook.addWorksheet(country);
//         const states = countryStateData[country];
//         for (let i = 0; i < states.length; i++) {
//             countrySheets[country].getCell(`A${i + 1}`).value = states[i];
//         }
//     }

//     // Set up data validation for Country column (A) in main sheet
//     mainSheet.getCell('A1').value = 'Country';
//     for (let i = 2; i <= 10; i++) {
//         mainSheet.getCell(`A${i}`).dataValidation = {
//             type: 'list',
//             allowBlank: true,
//             formulae: ['"USA,Canada,Mexico,India"']
//         };
//     }

//     // Set up data validation for State column (B) in main sheet
//     mainSheet.getCell('B1').value = 'State';
//     for (let i = 2; i <= 10; i++) {
//         mainSheet.getCell(`B${i}`).dataValidation = {
//             type: 'list',
//             allowBlank: true,
//             allowMultiple: true,
//             formulae: [`=INDIRECT(A${i} & "!A:A")`]
//         };
//     }

//     // Add a custom formula to concatenate selected values
//     for (let i = 2; i <= 10; i++) {
//         mainSheet.getCell(`B${i}`).formula = `=TEXTJOIN(", ",TRUE,B${i})`;
//     }

//     // Save the workbook
//     await workbook.xlsx.writeFile('dependent-dropdown-multi-select.xlsx');
// }

// createExcelWithDependentDropdown().catch(console.error);













// const ExcelJS = require('exceljs');
// const path = require("path")

// const countryStateData = {
//     "India": ["Gujarat", "Delhi", "Banglore", "Chennai"],
//     "USA": ["California", "New York", "Texas"],
//     "Canada": ["Ontario", "Quebec", "British Columbia"],
//     "Mexico": ["Mexico City", "Guadalajara", "Monterrey"]
// };

// async function createExcelWithDependentDropdown() {
//     const workbook = new ExcelJS.Workbook();
//     const mainSheet = workbook.addWorksheet('Main');

//     // Create a sheet for each country
//     const countrySheets = {};
//     for (const country in countryStateData) {
//         countrySheets[country] = workbook.addWorksheet(country);
//         const states = countryStateData[country];
//         for (let i = 0; i < states.length; i++) {
//             countrySheets[country].getCell(`A${i + 1}`).value = states[i];
//         }
//     }

//     // Set up data validation for Country column (A) in main sheet
//     mainSheet.getCell('A1').value = 'Country';
//     for (let i = 2; i <= 10; i++) {
//         mainSheet.getCell(`A${i}`).dataValidation = {
//             type: 'list',
//             allowBlank: true,
//             formulae: ['"USA,Canada,Mexico,India"']
//         };
//     }
//     // Set up data validation for State column (B) in main sheet
//     mainSheet.getCell('B1').value = 'State';
//     for (let i = 2; i <= 10; i++) {
//         const countryCell = mainSheet.getCell(`A${i}`);
//         let country = countryCell.value;
//         if (country) {
//             const states = countryStateData[country];
//             if (states) {
//                 const stateList = states.map(state => `"${state}"`).join(',');
//                 mainSheet.getCell(`B${i}`).dataValidation = {
//                     type: 'list',
//                     allowBlank: true,
//                     formulae: `=Main!B:B`,
//                     errorStyle: 'information',
//                     errorTitle: 'Select states',
//                     error: 'Select one or more states',
//                     showErrorMessage: true,
//                     showInputMessage: true,
//                     promptTitle: 'Select states',
//                     prompt: 'Select one or more states',
//                     checkbox: true
//                 };
//                 mainSheet.getCell(`B${i}`).dataValidation.allowMultiSelection = true;
//             }
//         }
//     }

//     // Save the workbook
//     await workbook.xlsx.writeFile('dependent-dropdown-multi-select-checkbox.xlsx');
// }

// createExcelWithDependentDropdown().catch(console.error);



// const ExcelJS = require('exceljs');

// async function createExcelWithMultiSelectDropdown() {
//     const workbook = new ExcelJS.Workbook();
//     const mainSheet = workbook.addWorksheet('Main');

//     // Create a dropdown list with multiple selection
//     mainSheet.getCell('A1').value = 'Select States';
//     mainSheet.getCell('A2').dataValidation = {
//         type: 'list',
//         allowBlank: true,
//         formulae: ['=States'],
//         errorStyle: 'information',
//         errorTitle: 'Select states',
//         error: 'Select one or more states',
//         showErrorMessage: true,
//         showInputMessage: true,
//         promptTitle: 'Select states',
//         prompt: 'Select one or more states',
//         checkbox: true
//     };
//     mainSheet.getCell('A2').dataValidation.allowMultiSelection = true;

//     // Create a named range for the list of states
//     const states = ["Gujarat", "Delhi", "Banglore", "Chennai", "California", "New York", "Texas", "Ontario", "Quebec", "British Columbia", "Mexico City", "Guadalajara", "Monterrey"];
//     // const statesRange = mainSheet.addRows(states.map((state, index) => ({ value: state })));
//     const statesRange = mainSheet.getRange(2, 1, states.length, 1);
//     workbook.addNamedRange({
//         name: 'States',
//         refersTo: statesRange,
//         scope: mainSheet
//     });

//     // Save the workbook
//     await workbook.xlsx.writeFile('multi-select-dropdown-checkbox.xlsx');
// }

// createExcelWithMultiSelectDropdown().catch(console.error);

