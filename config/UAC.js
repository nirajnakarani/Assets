const UACModel = require("../models/uacModel")

const findUAC = async (id, uacMain, module, action) => {
    return new Promise(async (resolve, reject) => {
        try {
            const UACData = await UACModel.findOne({ assignEmployee: id, isActive: true, isDeleted: false });
            if (!UACData) return resolve(false);

            const isAccess = UACData.UAC[uacMain].module[module].action[action].isAccess;
            if (!isAccess) return resolve(false)

            return resolve(true)
        } catch (error) {
            reject(false)
        }
    })
}
module.exports = {
    findUAC
}