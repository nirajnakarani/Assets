const jwt = require("jsonwebtoken");

const authentication = async (token) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.ASSETS_SECRET_KEY, (err, decoded) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
};

module.exports = authentication;