const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { HTTP } = require("../constant/constant");

const client = async (token) => {
    return new Promise(async (resolve, reject) => {
        try {
            jwt.verify(token, process.env.ASSETS_SECRET_KEY, async (err, decoded) => {
                if (err) {
                    console.log(err);
                    // reject({ status: HTTP.INTERNAL_SERVER, message: err.message });
                    reject(false)
                } else {
                    const userData = await User.findOne({ _id: decoded?.userId, isActive: true }).select("-password");
                    if (!userData) reject({ status: HTTP.NOT_FOUND, message: "Client Not Found" });
                    resolve(userData)
                }
            });
        } catch (error) {
            reject(false)
        }
    }).catch(err => false);
};



module.exports = client;