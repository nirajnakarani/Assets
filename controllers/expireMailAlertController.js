const { HTTP } = require("../constant/constant");
const ExpireMailAlert = require("../models/expireMailAlert");
const Location = require("../models/locationModel");
const { addExpireWarrantyMailValidation, updateExpireWarrantyMailValidation } = require("../validation/expire warranty mail/expireWarrantyMail");
const deleteValidationSchema = require("../validation/global/delete");

// * ----- default mail alert -----
const defaultEmailAlert = async () => {
    console.log(" ========== default mail alert ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const locationData = await ExpireMailAlert.findOne({ location: null, isDefault: true });
            if (locationData) return resolve()
            await ExpireMailAlert.create({ location: null, isDefault: true })
            return resolve()
        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: 'INTERNAL SERVER ERROR' });
        }
    })
}

// * ----- add mail alert -----
const addEmailAlert = async (data, client) => {
    console.log(" ========== add mail alert ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            data.createdBy = client?._id?.toString();
            const { error, value } = addExpireWarrantyMailValidation.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message })

            const locationData = await Location.findOne({ _id: value?.location, isActive: true, isDeleted: false });
            if (!locationData) return reject({ status: HTTP?.NOT_FOUND, message: "Invalid Location" })

            const exisitingLocation = await ExpireMailAlert.findOne({ location: value?.location, isActive: true, isDeleted: false });
            if (exisitingLocation) return reject({ status: HTTP?.BAD_REQ, message: "Location already exist" });

            await ExpireMailAlert.create(value);

        } catch (error) {
            console.log(error);

            return reject({ status: HTTP?.INTERNAL_SERVER, message: 'INTERNAL SERVER ERROR' });
        }
    })
}

// * ----- Show mail alert -----
const showEmailAlert = async (data) => {
    console.log(" ========== show mail alert ========== ");

    return new Promise(async (resolve, reject) => {
        try {

            const exisitingLocation = await ExpireMailAlert.find({ isActive: true, isDeleted: false });

            return resolve({ status: HTTP?.SUCCESS, message: 'Here are email alert data', exisitingLocation })

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: 'INTERNAL SERVER ERROR' });
        }
    })
}

// * ----- update mail alert -----
const updateEmailAlert = async (data) => {
    console.log(" ========== update mail alert ========== ");

    return new Promise(async (resolve, reject) => {
        try {

            const { error, value } = updateExpireWarrantyMailValidation.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message })

            const locationData = await Location.findOne({ _id: value?.location, isActive: true, isDeleted: false, isDefault: false });
            if (!locationData) return reject({ status: HTTP?.NOT_FOUND, message: "Invalid Location" })

            const exisitingLocation = await ExpireMailAlert.findById(value?.emailAlertId);
            if (!exisitingLocation) return reject({ status: HTTP?.NOT_FOUND, message: "Invalid Update Email Alert" })

            if (exisitingLocation?.location != value?.location) {
                const exisitingLocation = await ExpireMailAlert.findOne({ location: value?.location, isActive: true, isDeleted: false });
                if (exisitingLocation) return reject({ status: HTTP?.BAD_REQ, message: "Location already exist" });
            }

            await ExpireMailAlert.findByIdAndUpdate(
                value?.emailAlertId,
                {
                    location: value?.location,
                    $addToSet: {
                        userList: { $each: value?.userList }
                    }
                },
                { new: true }
            );
            // await ExpireMailAlert.create(value);
            return resolve({ status: HTTP?.SUCCESS, message: 'Email Alert Updated Successfully...' })

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: 'INTERNAL SERVER ERROR' });
        }
    })
}

// * ----- delete mail alert -----
const deleteEmailAlert = async (data, client) => {
    console.log(" ========== delete mail alert ========== ");

    return new Promise(async (resolve, reject) => {
        try {

            data.deletedBy = client?._id?.toString();
            data.isDeleted = true;
            data.deletedOn = Date.now();
            const { error, value } = deleteValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            const isDefaultAlert = await ExpireMailAlert.findOne({ _id: value?.emailAlertId, isActive: true, isDefault: true });
            if (isDefaultAlert) return reject({ status: HTTP?.BAD_REQ, message: 'System generated Email Alert not delete' });

            // Fetch the existing alert from the database
            const existingAlert = await ExpireMailAlert.findOne({ _id: value?.emailAlertId, isActive: true });
            if (!existingAlert) return reject({ status: HTTP?.NOT_FOUND, message: 'Email Alert not found' });
            if (existingAlert?.isDeleted) return resolve({ status: HTTP?.SUCCESS, message: 'Email Alert already deleted' });

            // Update only the fields that have changed in the existing Alert
            Object.keys(value).forEach(key => {
                if (value[key] && existingAlert[key] != value[key]) {
                    existingAlert[key] = value[key];
                }
            });

            // Save the deleted Alert
            const deletedAlert = await existingAlert.save();

            return resolve({ status: HTTP?.SUCCESS, message: 'Email Alert deleted successfully', deletedAlert });
        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: 'INTERNAL SERVER ERROR' });
        }
    })
}


module.exports = {
    defaultEmailAlert,
    addEmailAlert,
    showEmailAlert,
    updateEmailAlert,
    deleteEmailAlert
}