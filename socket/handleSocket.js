// ─────────────────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────────────────
const { downloadError, downloadSample, dwonloadAssetExcel } = require("../api/controllers/excel");
const client = require("../config/client");
const { findUAC } = require("../config/UAC");
const { HTTP } = require("../constant/constant");
const { addAssets, updateAssets, showAllAssets, showAssets, deleteAssets, showAvailableAssets, importAssetData, getPdfAsset, auditAssets, activityAsset, activityAssetExcel } = require("../controllers/assetsController");
const { addCategory, updateCategory, showAllCategory, deleteCategory, showCategory, fetchCategory, activityCategory, activityCategoryExcel } = require("../controllers/categoryController");
const { addCondition, showAllCondition, showCondition, updateCondition, deleteCondition, defaultCondition, activityCondition, activityConditionExcel } = require("../controllers/conditionController");
const { defaultEmailAlert, showEmailAlert, addEmailAlert, updateEmailAlert, deleteEmailAlert } = require("../controllers/expireMailAlertController");
const { addLocation, showAllLocation, showLocation, updateLocation, deleteLocation, activityLocation, activityLocationExcel } = require("../controllers/locationController");
const { addSubCategory, showAllSubCategory, showSubCategory, fetchSubCategory, updateSubCategory, deleteSubCategory, activitySubCategory, activitySubCategoryExcel } = require("../controllers/subCategoryController");
const { addTag, showAllTag, showTag, updateTag, deleteTag, activityTag, activityTagExcel } = require("../controllers/tagController");
const { defaultUAC, showAllUAC, addUAC, assignedUAC, cloneUAC, deleteUAC } = require("../controllers/uacController");
const { register, login, showAllAssigned, showAssigned } = require("../controllers/userController");
const { addVendor, showAllVendor, deleteVendor, updateVendor, showVendor, activityVendor, activityVendorExcel } = require("../controllers/vendorController");

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @description  Handle authentication for routing
 * @param {String} type - Event type
 * @returns {Boolean} If auth not required then false
 */
// function byPassClientAuth(type) {
//     const noAuthRequiredTypes = ["register", "login", "refreshToken"];
//     return !noAuthRequiredTypes.includes(type);
// }
const byPassClientAuth = (type) => !["register", "login", "refreshToken"].includes(type);

// ─────────────────────────────────────────────────────────────────────────────
// Main Function
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @description Hanlde Socket event and event listener
 * @param {SocketIO.Server} io - The Socket.IO server instance.
 */

function handleSocket(io) {

    io.on("connection", (socket) => {
        console.log("user connected", socket.id);

        socket.on('disconnect', () => {
            console.log('user disconnected', socket.id);
        });

        socket.on("request", async (req) => {

            let data = req;
            console.log("-data-", data);
            console.log("-data.type-", data.type);

            // let data;

            // // req = JSON.stringify(req)
            // try {
            //     data = JSON.parse(req);
            // } catch (error) {
            //     console.error("Invalid JSON format:", error);
            //     socket.emit("response", { type: "error", message: "Invalid JSON format" });
            //     return;
            // }

            // * Authentication Routes
            if (byPassClientAuth(data?.type)) {
                if (!socket?.request?.session?.client) return socket.emit("response", { type: "error", message: "Unauthorized access" });
            }

            // * Get client data using the token from session
            let clientData;
            if (socket?.request?.session?.client) {
                clientData = await client(socket?.request?.session?.client)
            }

            // * Switch case base on type (event)
            switch (data?.type) {

                // ? ===== refresh token =====
                case "refreshToken": {
                    if (!socket?.request?.session?.client && data?.token) {
                        try {
                            const isToken = await client(data?.token);
                            if (!isToken) return socket.emit("response", { type: "error", status: HTTP?.BAD_REQ, message: "Invalid Token" });

                            socket.request.session.client = data?.token;
                            socket.emit("response", { type: "refreshToken", status: HTTP?.SUCCESS, message: "Token Saved" })
                        } catch (error) {

                            console.error("JWT verification error:", error);
                            socket.emit("response", { type: "error", message: "Unauthorized access" });
                            return;
                        }
                    }
                    else if (socket?.request?.session?.client) {
                        socket.emit("response", { type: "refreshToken", status: HTTP?.CONFLICT, message: "You already login" })
                    }
                    break;
                }

                // ? ===== register =====
                case "register": {
                    try {
                        const result = await register(data?.data);
                        socket.emit("response", { type: "register", status: result?.status, result });
                    } catch (error) {
                        console.error("Error registering user:", error);
                        socket.emit("response", { type: "register", error: error.message });
                    }
                    break;
                }

                // ? ===== login =====
                case "login": {
                    try {
                        const result = await login(data?.data);
                        if (result.status == HTTP?.SUCCESS) {
                            socket.request.session.client = result?.token;
                            socket?.request?.session?.save((err) => {
                                if (err) {
                                    console.error('Session save error:', err);
                                } else {
                                    console.log('Session after login:', socket.request.session);
                                }
                            });
                            socket.emit("response", { type: "login", result });
                        } else {
                            socket.emit("response", { type: "login", result });
                        }
                    } catch (error) {
                        console.error("Error logging in user:", error);
                        socket.emit("response", { type: "login", error: error.message });
                    }
                    break;
                }


                // ? ===== category =====

                case "addCategory": {
                    try {

                        // const clientData = await client(socket?.request?.session?.client);
                        // if (!clientData) return socket.emit("response", { type: "error", message: "Unauthorized access" });
                        // data.data.createdBy = clientData?._id.toString();

                        const isAccess = await findUAC(clientData?._id, "category", "category", "add");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })

                        const result = await addCategory(data?.data, clientData);
                        socket.emit("response", { type: "addCategory", result });
                    } catch (error) {
                        console.error("Error adding category:", error);
                        socket.emit("response", { type: "addCategory", error: error });
                    }
                    break;
                }
                case "showAllCategory": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "category", "category", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await showAllCategory();
                        socket.emit("response", { type: "showAllCategory", result });
                    } catch (error) {
                        console.error("Error fetching categories:", error);
                        socket.emit("response", { type: "showAllCategory", error: error.message });
                    }
                    break;
                }
                case "showCategory": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "category", "category", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await showCategory(data?.data);
                        socket.emit("response", { type: "showCategory", result });
                    } catch (error) {
                        console.error("Error fetching categories:", error);
                        socket.emit("response", { type: "showCategory", error: error.message });
                    }
                    break;
                }
                case "fetchCategory": {
                    try {
                        async function hasAddOrEditAccess(userId, moduleType, moduleName) {
                            const hasAddAccess = await findUAC(userId, moduleType, moduleName, "add");
                            const hasEditAccess = await findUAC(userId, moduleType, moduleName, "edit");
                            return hasAddAccess || hasEditAccess;
                        }

                        const isAccess = await hasAddOrEditAccess(clientData?._id, "category", "category");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" });
                        const result = await fetchCategory(data?.data);
                        socket.emit("response", { type: "fetchCategory", result });
                    } catch (error) {
                        console.error("Error fetching categories:", error);
                        socket.emit("response", { type: "fetchCategory", error: error.message });
                    }
                    break;
                }
                case "updateCategory": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "category", "category", "edit");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await updateCategory(data?.data, clientData);
                        socket.emit("response", { type: "updateCategory", result });
                    } catch (error) {
                        console.error("Error updating category:", error);
                        socket.emit("response", { type: "updateCategory", error: error.message });
                    }
                    break;
                }
                case "deleteCategory": {
                    try {

                        // const clientData = await client(socket?.request?.session?.client);
                        // if (!clientData) return socket.emit("response", { type: "error", message: "Unauthorized access" });

                        // data.data.deletedBy = clientData?._id.toString();
                        const isAccess = await findUAC(clientData?._id, "category", "category", "delete");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await deleteCategory(data?.data, clientData);
                        socket.emit("response", { type: "deleteCategory", result });
                    } catch (error) {
                        console.error("Error Delete category:", error);
                        socket.emit("response", { type: "deleteCategory", error: error.message });
                    }
                    break;
                }
                case "activityCategory": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "category", "category", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await activityCategory(data?.data);
                        socket.emit("response", { type: "activityCategory", result });
                    } catch (error) {
                        console.error("Error activity category:", error);
                        socket.emit("response", { type: "activityCategory", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "activityCategoryExcel": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "category", "category", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await activityCategoryExcel();
                        socket.emit("response", { type: "activityCategoryExcel", result });
                    } catch (error) {
                        console.error("Error activity category excel:", error);
                        socket.emit("response", { type: "activityCategoryExcel", status: error?.status, error: error.message });
                    }
                    break;
                }


                // ? ===== sub category =====

                case "addSubCategory": {
                    try {

                        // const clientData = await client(socket?.request?.session?.client);
                        // if (!clientData) return socket.emit("response", { type: "error", message: "Unauthorized access" });
                        // data.data.createdBy = clientData?._id.toString();

                        const isAccess = await findUAC(clientData?._id, "category", "category", "add");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })

                        const result = await addSubCategory(data?.data, clientData);
                        socket.emit("response", { type: "addSubCategory", result });
                    } catch (error) {
                        console.error("Error adding sub category:", error);
                        socket.emit("response", { type: "addSubCategory", error: error });
                    }
                    break;
                }
                case "showAllSubCategory": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "category", "category", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await showAllSubCategory();
                        socket.emit("response", { type: "showAllSubCategory", result });
                    } catch (error) {
                        console.error("Error fetching sub categories:", error);
                        socket.emit("response", { type: "showAllSubCategory", error: error.message });
                    }
                    break;
                }
                case "showSubCategory": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "category", "category", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await showSubCategory(data?.data);
                        socket.emit("response", { type: "showSubCategory", result });
                    } catch (error) {
                        console.error("Error fetching sub categories:", error);
                        socket.emit("response", { type: "showSubCategory", error: error.message });
                    }
                    break;
                }
                case "fetchSubCategory": {
                    try {
                        async function hasAddOrEditAccess(userId, moduleType, moduleName) {
                            const hasAddAccess = await findUAC(userId, moduleType, moduleName, "add");
                            const hasEditAccess = await findUAC(userId, moduleType, moduleName, "edit");
                            return hasAddAccess || hasEditAccess;
                        }

                        const isAccess = await hasAddOrEditAccess(clientData?._id, "category", "category");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" });
                        const result = await fetchSubCategory(data?.data);
                        socket.emit("response", { type: "fetchSubCategory", result });
                    } catch (error) {
                        console.error("Error fetching sub categories:", error);
                        socket.emit("response", { type: "fetchSubCategory", error: error.message });
                    }
                    break;
                }
                case "updateSubCategory": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "category", "category", "edit");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await updateSubCategory(data?.data, clientData);
                        socket.emit("response", { type: "updateSubCategory", result });
                    } catch (error) {
                        console.error("Error updating sub category:", error);
                        socket.emit("response", { type: "updateSubCategory", error: error.message });
                    }
                    break;
                }
                case "deleteSubCategory": {
                    try {

                        // const clientData = await client(socket?.request?.session?.client);
                        // if (!clientData) return socket.emit("response", { type: "error", message: "Unauthorized access" });

                        // data.data.deletedBy = clientData?._id.toString();
                        const isAccess = await findUAC(clientData?._id, "category", "category", "delete");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await deleteSubCategory(data?.data, clientData);
                        socket.emit("response", { type: "deleteSubCategory", result });
                    } catch (error) {
                        console.error("Error Delete sub category:", error);
                        socket.emit("response", { type: "deleteSubCategory", error: error.message });
                    }
                    break;
                }
                case "activitySubCategory": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "category", "category", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await activitySubCategory(data?.data);
                        socket.emit("response", { type: "activitySubCategory", result });
                    } catch (error) {
                        console.error("Error activity sub category:", error);
                        socket.emit("response", { type: "activitySubCategory", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "activitySubCategoryExcel": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "category", "category", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await activitySubCategoryExcel();
                        socket.emit("response", { type: "activitySubCategoryExcel", result });
                    } catch (error) {
                        console.error("Error activity sub category excel:", error);
                        socket.emit("response", { type: "activitySubCategoryExcel", status: error?.status, error: error.message });
                    }
                    break;
                }



                // ? ===== assets =====

                case "addAssets": {
                    try {
                        // const clientData = await client(socket?.request?.session?.client)
                        // if (!clientData) return socket.emit("response", { type: "error", message: "Unauthorized access" });

                        // // if(data?.data?.assignTo) 
                        // data.data.assignBy = clientData?._id.toString();

                        // data.data.createdBy = clientData?._id.toString();

                        const isAccess = await findUAC(clientData?._id, "assets", "assets", "add");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" });
                        const result = await addAssets(data?.data, clientData);
                        socket.emit("response", { type: "addAssets", result });
                    } catch (error) {
                        console.error("Error adding assets:", error);
                        socket.emit("response", { type: "addAssets", status: error?.status, error: error?.message });
                    }
                    break;
                }
                case "showAllAssets": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "assets", "assets", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await showAllAssets();
                        socket.emit("response", { type: "showAllAssets", result });
                    } catch (error) {
                        console.error("Error fetching assets:", error);
                        socket.emit("response", { type: "showAllAssets", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "showAvailableAssets": {
                    try {
                        async function hasAddOrEditAccess(userId, moduleType, moduleName) {
                            const hasAddAccess = await findUAC(userId, moduleType, moduleName, "add");
                            const hasEditAccess = await findUAC(userId, moduleType, moduleName, "edit");
                            return hasAddAccess || hasEditAccess;
                        }

                        const isAccess = await hasAddOrEditAccess(clientData?._id, "assets", "assets");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" });

                        const result = await showAvailableAssets(data?.data);
                        socket.emit("response", { type: "showAvailableAssets", result });
                    } catch (error) {
                        console.error("Error fetching assets:", error);
                        socket.emit("response", { type: "showAvailableAssets", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "showAssets": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "assets", "assets", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await showAssets(data?.data);
                        socket.emit("response", { type: "showAssets", result });
                    } catch (error) {
                        console.error("Error fetching categories:", error);
                        socket.emit("response", { type: "showAssets", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "updateAssets": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "assets", "assets", "edit");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await updateAssets(data?.data, clientData);
                        socket.emit("response", { type: "updateAssets", result });
                    } catch (error) {
                        console.error("Error updating asset:", error);
                        socket.emit("response", { type: "updateAssets", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "deleteAssets": {
                    try {

                        // data.data.deletedBy = clientData?._id.toString();
                        const isAccess = await findUAC(clientData?._id, "assets", "assets", "delete");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" });
                        const result = await deleteAssets(data?.data, clientData);
                        socket.emit("response", { type: "deleteAssets", result });
                    } catch (error) {
                        console.error("Error Delete assets:", error);
                        socket.emit("response", { type: "deleteAssets", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "getAssetExcel": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "assets", "assets", "add");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await dwonloadAssetExcel();
                        socket.emit("response", { type: "getAssetExcel", result });
                    } catch (error) {
                        console.error("Error download assets excel:", error);
                        socket.emit("response", { type: "getAssetExcel", error: error?.message });
                    }
                    break;
                }
                case "importAssetData": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "assets", "assets", "add");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await importAssetData(clientData);
                        socket.emit("response", { type: "importAssetData", result });
                    } catch (error) {
                        console.error("Error import assets data:", error);
                        socket.emit("response", { type: "importAssetData", error: error?.message });
                    }
                    break;
                }
                case "getSampleAsset": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "assets", "assets", "add");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await downloadSample();
                        socket.emit("response", { type: "getSampleAsset", result });
                    } catch (error) {
                        console.error("Error download sample assets:", error);
                        socket.emit("response", { type: "getSampleAsset", error: error?.message });
                    }
                    break;
                }
                case "getErrorAsset": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "assets", "assets", "add");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await downloadError(clientData);
                        socket.emit("response", { type: "getErrorAsset", result });
                    } catch (error) {
                        console.error("Error download error assets:", error);
                        socket.emit("response", { type: "getErrorAsset", error: error?.message });
                    }
                    break;
                }
                case "getPdfAsset": {
                    try {
                        // async function hasAddOrEditOrViewAccess(userId, moduleType, moduleName) {
                        //     const hasAddAccess = await findUAC(userId, moduleType, moduleName, "add");
                        //     const hasEditAccess = await findUAC(userId, moduleType, moduleName, "edit");
                        //     const hasViewAccess = await findUAC(userId, moduleType, moduleName, "view");
                        //     return hasAddAccess || hasEditAccess || hasViewAccess;
                        // }

                        // const isAccess = await hasAddOrEditOrViewAccess(clientData?._id, "assets", "assets");
                        // if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })

                        const isAccess = await findUAC(clientData?._id, "assets", "assets", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await getPdfAsset(clientData);
                        socket.emit("response", { type: "getPdfAsset", result });
                    } catch (error) {
                        console.error("Error download pdf assets:", error);
                        socket.emit("response", { type: "getPdfAsset", error: error?.message });
                    }
                    break;
                }
                case "auditAssets": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "assets", "assets", "edit");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await auditAssets(data?.data, clientData);
                        socket.emit("response", { type: "auditAssets", result });
                    } catch (error) {
                        console.error("Error audit asset:", error);
                        socket.emit("response", { type: "auditAssets", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "activityAsset": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "assets", "assets", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await activityAsset(data?.data);
                        socket.emit("response", { type: "activityAsset", result });
                    } catch (error) {
                        console.error("Error activity asset:", error);
                        socket.emit("response", { type: "activityAsset", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "activityAssetExcel": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "assets", "assets", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await activityAssetExcel(data?.data);
                        socket.emit("response", { type: "activityAssetExcel", result });
                    } catch (error) {
                        console.error("Error activity asset excel:", error);
                        socket.emit("response", { type: "activityAssetExcel", status: error?.status, error: error.message });
                    }
                    break;
                }


                // ? ===== email alert =====

                case "showEmailAlert": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "emailAlert", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        await defaultEmailAlert()
                        const result = await showEmailAlert();
                        socket.emit("response", { type: "showEmailAlert", result });
                    } catch (error) {
                        console.error("Error activity asset:", error);
                        socket.emit("response", { type: "showEmailAlert", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "addEmailAlert": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "emailAlert", "edit");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await addEmailAlert(data?.data, clientData);
                        socket.emit("response", { type: "addEmailAlert", result });
                    } catch (error) {
                        console.error("Error activity asset:", error);
                        socket.emit("response", { type: "addEmailAlert", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "updateEmailAlert": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "emailAlert", "edit");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await updateEmailAlert(data?.data);
                        socket.emit("response", { type: "updateEmailAlert", result });
                    } catch (error) {
                        console.error("Error activity asset:", error);
                        socket.emit("response", { type: "updateEmailAlert", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "deleteEmailAlert": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "emailAlert", "edit");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await deleteEmailAlert(data?.data, clientData);
                        socket.emit("response", { type: "deleteEmailAlert", result });
                    } catch (error) {
                        console.error("Error activity asset:", error);
                        socket.emit("response", { type: "deleteEmailAlert", status: error?.status, error: error.message });
                    }
                    break;
                }


                // ? ===== assigned =====

                case "showAllAssigned": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "assigned", "assigned", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" });
                        const result = await showAllAssigned();
                        socket.emit("response", { type: "showAllAssigned", result });
                    } catch (error) {
                        console.error("Error fetching assigned:", error);
                        socket.emit("response", { type: "showAllAssigned", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "showAssigned": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "assigned", "assigned", "view");
                        if (!isAccess) data.data.userId = clientData?._id?.toString();
                        const result = await showAssigned(data?.data);
                        socket.emit("response", { type: "showAssigned", result });
                    } catch (error) {
                        console.error("Error fetching assigned:", error);
                        socket.emit("response", { type: "showAssigned", status: error?.status, error: error.message });
                    }
                    break;
                }


                // ? ===== vendor =====

                case "addVendor": {
                    try {

                        // const clientData = await client(socket?.request?.session?.client)
                        // if (!clientData) return socket.emit("response", { type: "error", message: "Unauthorized access" });
                        // data.data.createdBy = clientData?._id.toString();
                        const isAccess = await findUAC(clientData?._id, "vendor", "vendor", "add");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await addVendor(data?.data, clientData);
                        socket.emit("response", { type: "addVendor", result });
                    } catch (error) {
                        console.error("Error adding vendor:", error);
                        socket.emit("response", { type: "addVendor", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "showAllVendor": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "vendor", "vendor", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await showAllVendor();
                        socket.emit("response", { type: "showAllVendor", result });
                    } catch (error) {
                        console.error("Error fetching vendor:", error);
                        socket.emit("response", { type: "showAllVendor", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "showVendor": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "vendor", "vendor", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await showVendor(data?.data);
                        socket.emit("response", { type: "showVendor", result });
                    } catch (error) {
                        console.error("Error fetching vendor:", error);
                        socket.emit("response", { type: "showVendor", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "updateVendor": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "vendor", "vendor", "edit");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await updateVendor(data?.data, clientData);
                        socket.emit("response", { type: "updateVendor", result });
                    } catch (error) {
                        console.error("Error updating Vendor:", error);
                        socket.emit("response", { type: "updateVendor", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "deleteVendor": {
                    try {

                        // const clientData = await client(socket?.request?.session?.client)
                        // if (!clientData) return socket.emit("response", { type: "error", message: "Unauthorized access" });

                        // data.data.deletedBy = clientData?._id.toString();
                        const isAccess = await findUAC(clientData?._id, "vendor", "vendor", "delete");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await deleteVendor(data?.data, clientData);
                        socket.emit("response", { type: "deleteVendor", result });
                    } catch (error) {
                        console.error("Error Delete Vendor:", error);
                        socket.emit("response", { type: "deleteVendor", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "activityVendor": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "vendor", "vendor", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await activityVendor(data?.data);
                        socket.emit("response", { type: "activityVendor", result });
                    } catch (error) {
                        console.error("Error activity vendor:", error);
                        socket.emit("response", { type: "activityVendor", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "activityVendorExcel": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "vendor", "vendor", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await activityVendorExcel();
                        socket.emit("response", { type: "activityVendorExcel", result });
                    } catch (error) {
                        console.error("Error activity vendor excel:", error);
                        socket.emit("response", { type: "activityVendorExcel", status: error?.status, error: error.message });
                    }
                    break;
                }


                // ? ===== location =====

                case "addLocation": {
                    try {

                        // const clientData = await client(socket?.request?.session?.client)
                        // if (!clientData) return socket.emit("response", { type: "error", message: "Unauthorized access" });
                        // data.data.createdBy = clientData?._id.toString();


                        // const isAccess = await findUAC(clientData?._id, "location", "location", "add");
                        // if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await addLocation(data?.data, clientData);
                        socket.emit("response", { type: "addLocation", result });
                    } catch (error) {
                        console.error("Error adding location:", error);
                        socket.emit("response", { type: "addLocation", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "showAllLocation": {
                    try {
                        console.log(socket.request.session.client)
                        const result = await showAllLocation();
                        socket.emit("response", { type: "showAllLocation", result });
                    } catch (error) {
                        console.error("Error fetching location:", error);
                        socket.emit("response", { type: "showAllLocation", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "showLocation": {
                    try {
                        const result = await showLocation(data?.data);
                        socket.emit("response", { type: "showLocation", result });
                    } catch (error) {
                        console.error("Error fetching Location:", error);
                        socket.emit("response", { type: "showLocation", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "updateLocation": {
                    try {
                        const result = await updateLocation(data?.data, clientData);
                        socket.emit("response", { type: "updateLocation", result });
                    } catch (error) {
                        console.error("Error updating Tag:", error);
                        socket.emit("response", { type: "updateLocation", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "deleteLocation": {
                    try {

                        // const clientData = await client(socket?.request?.session?.client)
                        // if (!clientData) return socket.emit("response", { type: "error", message: "Unauthorized access" });

                        // data.data.deletedBy = clientData?._id.toString();

                        const result = await deleteLocation(data?.data, clientData);
                        socket.emit("response", { type: "deleteLocation", result });
                    } catch (error) {
                        console.error("Error Delete Location:", error);
                        socket.emit("response", { type: "deleteLocation", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "activityLocation": {
                    try {
                        // const isAccess = await findUAC(clientData?._id, "location", "location", "view");
                        // if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await activityLocation(data?.data);
                        socket.emit("response", { type: "activityLocation", result });
                    } catch (error) {
                        console.error("Error activity location:", error);
                        socket.emit("response", { type: "activityLocation", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "activityLocationExcel": {
                    try {
                        const result = await activityLocationExcel();
                        socket.emit("response", { type: "activityLocationExcel", result });
                    } catch (error) {
                        console.error("Error activity location excel:", error);
                        socket.emit("response", { type: "activityLocationExcel", status: error?.status, error: error.message });
                    }
                    break;
                }


                // ? ===== tag =====

                case "addTag": {
                    try {

                        // const clientData = await client(socket?.request?.session?.client)
                        // if (!clientData) return socket.emit("response", { type: "error", message: "Unauthorized access" });
                        // data.data.createdBy = clientData?._id.toString();
                        const isAccess = await findUAC(clientData?._id, "setting", "tag", "add");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await addTag(data?.data, clientData);
                        socket.emit("response", { type: "addTag", result });
                    } catch (error) {
                        console.error("Error adding Tag:", error);
                        socket.emit("response", { type: "addTag", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "showAllTag": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "tag", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await showAllTag();
                        socket.emit("response", { type: "showAllTag", result });
                    } catch (error) {
                        console.error("Error fetching Tag:", error);
                        socket.emit("response", { type: "showAllTag", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "showTag": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "tag", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await showTag(data?.data);
                        socket.emit("response", { type: "showTag", result });
                    } catch (error) {
                        console.error("Error fetching Tag:", error);
                        socket.emit("response", { type: "showTag", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "updateTag": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "tag", "edit");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await updateTag(data?.data, clientData);
                        socket.emit("response", { type: "updateTag", result });
                    } catch (error) {
                        console.error("Error updating Tag:", error);
                        socket.emit("response", { type: "updateTag", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "deleteTag": {
                    try {

                        // const clientData = await client(socket?.request?.session?.client)
                        // if (!clientData) return socket.emit("response", { type: "error", message: "Unauthorized access" });

                        // data.data.deletedBy = clientData?._id.toString();
                        const isAccess = await findUAC(clientData?._id, "setting", "tag", "delete");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await deleteTag(data?.data, clientData);
                        socket.emit("response", { type: "deleteTag", result });
                    } catch (error) {
                        console.error("Error Delete Tag:", error);
                        socket.emit("response", { type: "deleteTag", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "activityTag": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "tag", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await activityTag(data?.data);
                        socket.emit("response", { type: "activityTag", result });
                    } catch (error) {
                        console.error("Error activity tag:", error);
                        socket.emit("response", { type: "activityTag", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "activityTagExcel": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "tag", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await activityTagExcel();
                        socket.emit("response", { type: "activityTagExcel", result });
                    } catch (error) {
                        console.error("Error activity tag excel:", error);
                        socket.emit("response", { type: "activityTagExcel", status: error?.status, error: error.message });
                    }
                    break;
                }


                // ? ===== condition =====

                case "addCondition": {
                    try {

                        const isAccess = await findUAC(clientData?._id, "setting", "condition", "add");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await addCondition(data?.data, clientData);
                        socket.emit("response", { type: "addCondition", result });
                    } catch (error) {
                        console.error("Error adding Condition:", error);
                        socket.emit("response", { type: "addCondition", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "showAllCondition": {
                    try {

                        await defaultCondition()
                        const isAccess = await findUAC(clientData?._id, "setting", "condition", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await showAllCondition();
                        socket.emit("response", { type: "showAllCondition", result });
                    } catch (error) {
                        console.error("Error fetching Condition:", error);
                        socket.emit("response", { type: "showAllCondition", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "showCondition": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "condition", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await showCondition(data?.data);
                        socket.emit("response", { type: "showCondition", result });
                    } catch (error) {
                        console.error("Error fetching Condition:", error);
                        socket.emit("response", { type: "showCondition", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "updateCondition": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "condition", "edit");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await updateCondition(data?.data, clientData);
                        socket.emit("response", { type: "updateCondition", result });
                    } catch (error) {
                        console.error("Error updating Condition:", error);
                        socket.emit("response", { type: "updateCondition", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "deleteCondition": {
                    try {

                        // const clientData = await client(socket?.request?.session?.client)
                        // if (!clientData) return socket.emit("response", { type: "error", message: "Unauthorized access" });

                        // data.data.deletedBy = clientData?._id.toString();
                        const isAccess = await findUAC(clientData?._id, "setting", "condition", "edit");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await deleteCondition(data?.data, clientData);
                        socket.emit("response", { type: "deleteCondition", result });
                    } catch (error) {
                        console.error("Error Delete Condition:", error);
                        socket.emit("response", { type: "deleteCondition", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "activityCondition": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "condition", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await activityCondition(data?.data);
                        socket.emit("response", { type: "activityCondition", result });
                    } catch (error) {
                        console.error("Error activity condition:", error);
                        socket.emit("response", { type: "activityCondition", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "activityConditionExcel": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "condition", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await activityConditionExcel();
                        socket.emit("response", { type: "activityConditionExcel", result });
                    } catch (error) {
                        console.error("Error activity condition excel:", error);
                        socket.emit("response", { type: "activityConditionExcel", status: error?.status, error: error.message });
                    }
                    break;
                }


                // ? ===== UAC =====

                case "addUAC": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "accessLevel", "add");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await addUAC(data?.data);
                        socket.emit("response", { type: "addUAC", result });
                    } catch (error) {
                        console.error("Error Fatching UAC:", error);
                        socket.emit("response", { type: "addUAC", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "showAllUAC": {
                    try {
                        await defaultUAC();
                        const isAccess = await findUAC(clientData?._id, "setting", "accessLevel", "view");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await showAllUAC(data?.data);
                        socket.emit("response", { type: "showAllUAC", result });
                    } catch (error) {
                        console.error("Error Fatching UAC:", error);
                        socket.emit("response", { type: "showAllUAC", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "deleteUAC": {
                    try {

                        // const clientData = await client(socket?.request?.session?.client)
                        // if (!clientData) return socket.emit("response", { type: "error", message: "Unauthorized access" });

                        // data.data.deletedBy = clientData?._id.toString();
                        const isAccess = await findUAC(clientData?._id, "setting", "accessLevel", "delete");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await deleteUAC(data?.data, clientData);
                        socket.emit("response", { type: "deleteUAC", result });
                    } catch (error) {
                        console.error("Error Delete UAC:", error);
                        socket.emit("response", { type: "deleteUAC", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "assignedUAC": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "accessLevel", "assign");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await assignedUAC(data?.data);
                        socket.emit("response", { type: "assignedUAC", result });
                    } catch (error) {
                        console.error("Error Fatching UAC:", error);
                        socket.emit("response", { type: "assignedUAC", status: error?.status, error: error.message });
                    }
                    break;
                }
                case "cloneUAC": {
                    try {
                        const isAccess = await findUAC(clientData?._id, "setting", "accessLevel", "add");
                        if (!isAccess) return socket.emit("response", { type: "error", message: "Unauthorized Access" })
                        const result = await cloneUAC(data?.data);
                        socket.emit("response", { type: "cloneUAC", result });
                    } catch (error) {
                        console.error("Error Fatching UAC:", error);
                        socket.emit("response", { type: "cloneUAC", status: error?.status, error: error.message });
                    }
                    break;
                }


                // ! ===== default =====

                default: {
                    socket.emit("response", { type: "error", status: HTTP?.BAD_REQ, message: "Unknown request type" });
                    break;
                }
            }
        })
    })
}

module.exports = handleSocket