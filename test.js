// const Joi = require('joi');
// const moment = require('moment');

// const schema = Joi.object({
//     purchaseOn: Joi.date().optional(),
//     lastAuditDate: Joi.date().optional().default(function (context) {
//         const purchaseOn = context.purchaseOn;
//         const ninetyDaysAgo = moment().subtract(90, 'days');

//         // If purchaseOn exists and is within the last 90 days, use it
//         if (purchaseOn && moment(purchaseOn).isAfter(ninetyDaysAgo)) {
//             return purchaseOn;
//         }

//         // If neither purchaseOn nor lastAuditDate exists, return the current date
//         return moment().toDate();
//     })
// });

// // Example data to validate
// const data = {
//     // Uncomment each line to test different cases:
//     //   purchaseOn: '2024-06-01', // Case 1: within 90 days
//     //   lastAuditDate: '2024-08-01', // Case 2: this value will be used if provided
//     purchaseOn: '2024-07-01', // Case 3: older than 90 days, current date will be used
//     // Both fields commented out for Case 4: neither exists, current date will be used
// };

// const { error, value } = schema.validate(data, { abortEarly: false });

// if (error) {
//     console.log('Validation Error:', error.details[0].message);
// } else {
//     console.log('Validated Data:', value);
// }













const Joi = require('joi');

// Define the schema
const schema = Joi.object({
  assignTo: Joi.string().optional(), // Adjust type and validation as needed
  lastAuditDate: Joi.date().when('assignTo', {
    is: Joi.exist(), // Checks if 'assignTo' exists
    then: Joi.date().default(() => new Date()), // Defaults to current date if 'assignTo' exists
    otherwise: Joi.date().optional() // Allow 'lastAuditDate' to be optional if 'assignTo' does not exist
  })
});

// Example usage
const data = {
  // lastAuditDate is not provided, should default to the current date
};

const { error, value } = schema.validate(data, { stripUnknown: true });

if (error) {
  console.error('Validation Error:', error.details);
} else {
  console.log('Validation Successful:', value);
}
