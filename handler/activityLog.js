const Activity = require("../models/activityModel")

const activityLog = async (data) => {
    console.log(data);
    return new Promise(async (resolve, reject) => {
        try {
            await Activity.create(data);
            return resolve()
        } catch (error) {
            return reject(error)
        }
    })
}

module.exports = {
    activityLog
}