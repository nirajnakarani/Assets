const client = require('../config/client');
const { handleError } = require('../utils/handleError');
const { HTTP } = require('../constant/constant');

const authUser = async (req, res, next) => {
    const files = req?.files ? req?.files : req?.file ? [req?.file] : [];

    try {
        // * Extract token from headers
        const token = req?.headers["authorization"]?.split(" ")[1];
        if (!token) {
            console.log("token");
            return await handleError(res, HTTP?.UNAUTHORIZED, "Unauthorized access", files);
        }

        // * Get client data using the token
        const clientData = await client(token);
        if (!clientData) {
            console.log("clientData");
            return await handleError(res, HTTP?.UNAUTHORIZED, "Unauthorized access", files);
        }

        // * Attach client data to request object
        req.clientData = clientData;

        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.log("error", error);
        return await handleError(res, HTTP?.INTERNAL_SERVER, "INTERNAL SERVER ERROR", files);
    }
};

module.exports = authUser;
