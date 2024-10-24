// ─────────────────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────────────────
const { HTTP } = require("../constant/constant");
const UAC = require("../models/uacModel");
const uacAssignSchema = require("../validation/UAC/assignUAC");
const User = require("../models/userModel");
const showSingleValidationSchema = require("../validation/global/showSingle");
const deleteValidationSchema = require("../validation/global/delete");

// * ----- Default UAC -----
const defaultUAC = async () => {
    console.log(" ========== Default UAC ========== ");
    return new Promise(async (resolve, reject) => {
        try {

            const namesToCheck = ["Admin", "Manager", "Employee"];

            // * Admin Options 
            const adminOpt = {
                setting: {
                    type: "settings",
                    module: {
                        notification: {
                            name: "notification",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                        condition: {
                            name: "condition",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                        accessLevel: {
                            name: "accessLevel",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                                assign: {
                                    key: "assign",
                                    label: "assign",
                                    isAccess: true
                                },
                            }

                        },
                        notAvailableReason: {
                            name: "notAvailableReason",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                        emailAlert: {
                            name: "emailAlert",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }


                        },
                        tag: {
                            name: "tag",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }

                        },
                    }
                },
                category: {
                    type: "category",
                    module: {
                        category: {
                            name: "category",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                    }
                },
                assets: {
                    type: "assets",
                    module: {
                        assets: {
                            name: "assets",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                        details: {
                            name: "details",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                        conversation: {
                            name: "conversation",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                        internalNotes: {
                            name: "internalNotes",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                        activityLog: {
                            name: "activityLog",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                    }
                },
                assigned: {
                    type: "assigned",
                    module: {
                        assigned: {
                            name: "assigned",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                    }
                },
                vendor: {
                    type: "vendor",
                    module: {
                        vendor: {
                            name: "vendor",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                    }
                }
            }

            // * Manager Options 
            const managerOpt = {
                setting: {
                    type: "settings",
                    module: {
                        notification: {
                            name: "notification",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                        condition: {
                            name: "condition",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: false
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }
                        },
                        accessLevel: {
                            name: "accessLevel",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: false
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                                assign: {
                                    key: "assign",
                                    label: "assign",
                                    isAccess: true
                                },
                            }

                        },
                        notAvailableReason: {
                            name: "notAvailableReason",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: false
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }
                        },
                        emailAlert: {
                            name: "emailAlert",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: false
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }


                        },
                        tag: {
                            name: "tag",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: false
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }


                        },
                    }
                },
                category: {
                    type: "category",
                    module: {
                        category: {
                            name: "category",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: false
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }
                        },
                    }
                },
                assets: {
                    type: "assets",
                    module: {
                        assets: {
                            name: "assets",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                        details: {
                            name: "details",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }
                        },
                        conversation: {
                            name: "conversation",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }
                        },
                        internalNotes: {
                            name: "internalNotes",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }
                        },
                        activityLog: {
                            name: "activityLog",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }
                        },
                    }
                },
                assigned: {
                    type: "assigned",
                    module: {
                        assigned: {
                            name: "assigned",
                            view: {
                                action: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }
                        },
                    }
                },
                vendor: {
                    type: "vendor",
                    module: {
                        vendor: {
                            name: "vendor",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: false
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }
                        },
                    }
                }
            }

            // * Employee Options 
            const empOpt = {
                setting: {
                    type: "settings",
                    module: {
                        notification: {
                            name: "notification",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                        emailAlert: {
                            name: "emailAlert",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }


                        },
                    }
                },
                assets: {
                    type: "assets",
                    module: {
                        assets: {
                            name: "assets",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }
                        },
                        details: {
                            name: "details",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }
                        },
                        conversation: {
                            name: "conversation",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }
                        },
                        internalNotes: {
                            name: "internalNotes",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }
                        },
                        activityLog: {
                            name: "activityLog",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: false
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: false
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: false
                                },
                            }
                        },
                    }
                },
                assigned: {
                    type: "assigned",
                    module: {
                        assigned: {
                            name: "assigned",
                            action: {
                                view: {
                                    key: "view",
                                    label: "view",
                                    isAccess: true
                                },
                                edit: {
                                    key: "edit",
                                    label: "edit",
                                    isAccess: true
                                },
                                add: {
                                    key: "add",
                                    label: "add",
                                    isAccess: true
                                },
                                delete: {
                                    key: "delete",
                                    label: "delete",
                                    isAccess: true
                                },
                            }
                        },
                    }
                },

            }


            const owner = await User.findOne({ isActive: true, isOwner: true })
            if (!owner) return reject({ status: HTTP?.NOT_FOUND, message: "Owner not found in default UAC" });

            const assignEmployee = [
                owner?._id
            ]

            const uacObjects = namesToCheck.map(name => {
                if (name === "Admin") {
                    return { name: "Admin", isDefault: true, UAC: adminOpt, description: "Default access level for Admin, Can not be Deleted or Modified", UACType: 1, assignEmployee, activeCount: 1 };
                } else if (name === "Manager") {
                    return { name: "Manager", isDefault: true, UAC: managerOpt, description: "Default access level for manager, Can not be Deleted or Modified", UACType: 2 };
                } else if (name === "Employee") {
                    return { name: "Employee", isDefault: true, UAC: empOpt, description: "Default access level for employee, Can not be Deleted or Modified", UACType: 3 };
                }
            });

            // ? Find UAC that match the names and are default
            const foundNames = (await UAC.find({
                name: { $in: namesToCheck },
                isDefault: true,
            })).map(uac => uac?.name);

            // ? Missing names and insert them if necessary
            const missingNames = namesToCheck?.filter(name => !foundNames?.includes(name));

            if (!missingNames?.length) return resolve();

            // ? Prepare objects to insert for missing names
            const missingUACObjects = uacObjects.filter(uac => missingNames?.includes(uac?.name));

            await UAC.insertMany(missingUACObjects);
            console.log('Inserted new UAC:', missingNames);
            return resolve();

        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    })
}

// * ----- Add UAC -----
const addUAC = async (data) => {
    console.log(" ========== add UAC ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            if (!data?.name || !data?.description) {
                return reject({ status: HTTP?.BAD_REQ, message: "All fields are required" });
            }
            const chekcUAC = await UAC.findOne({ name: data?.name, isActive: true, isDeleted: false });
            if (chekcUAC) return reject({ status: HTTP?.BAD_REQ, message: "UAC already exisiting" });
            await UAC(data).save();
            resolve({ status: HTTP?.SUCCESS, message: "UAC Added" })
        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Show All UAC -----
const showAllUAC = async (data) => {
    console.log(" ========== show all UAC ========== ");
    return new Promise(async (resolve, reject) => {

        try {
            const { search } = data;

            const userQuery = {
                name: { $regex: new RegExp(search, 'i') }, // Case-insensitive search
                isActive: true // Only active users
            };

            const users = await User.find(userQuery, { _id: 1 }); // Fetch only the user IDs
            const userIds = users.map(user => user?._id);

            const query = {
                $or: [
                    { name: { $regex: new RegExp(search, 'i') } }, // Case-insensitive search
                    { assignEmployee: { $in: userIds } } // Match UACs where assignEmployee contains any of the user IDs
                ],
                isActive: true, // Only activate assets
                isDeleted: false // Only non deleted assets
            };

            const UACData = await UAC.find(query);

            // if (!UACData) return reject({ status: HTTP?.NOT_FOUND, message: 'UAC not found' });

            return resolve({ status: HTTP?.SUCCESS, message: "Here are all UAC", UACData, UACCount: UACData?.length })

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Assigned UAC -----
const assignedUAC = async (data) => {
    console.log(" ========== assigned UAC ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = uacAssignSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message })

            const chekcUAC = await UAC.findOne({ _id: value?.UACId, isActive: true, isDeleted: false });
            if (!chekcUAC) return reject({ status: HTTP?.NOT_FOUND, message: 'UAC not found' });


            // * New Assign
            if (Array.isArray(value?.newAssign) && value?.newAssign.length > 0) {
                try {
                    // Ensure unique IDs
                    const uniqueNewAssign = Array.from(new Set(value.newAssign));

                    // Fetch all users and UACs in bulk
                    const users = await User.find({ _id: { $in: uniqueNewAssign } });
                    const userMap = new Map(users.map(user => [user?._id.toString(), user]));

                    const uacPromises = [];
                    const userPromises = [];

                    // Fetch all UACs that have any of these users
                    const uacsWithAssign = await UAC.find({ assignEmployee: { $in: uniqueNewAssign } });

                    for (const id of uniqueNewAssign) {
                        const user = userMap.get(id);

                        if (!user) {
                            return reject({ status: HTTP?.BAD_REQ, message: `User ${id} is not found` });
                        }

                        // Update UACs that have this user as assignEmployee, excluding the current UAC
                        for (const uac of uacsWithAssign) {
                            if (uac._id.toString() !== value?.UACId && uac?.assignEmployee.includes(id)) {
                                uacPromises.push(
                                    UAC.findByIdAndUpdate(uac?._id, {
                                        $pull: { assignEmployee: id },
                                        $inc: { activeCount: user?.isActive ? -1 : 0 }
                                    }).catch(error => {
                                        console.error(`Error removing assignEmployee ${id} from UAC ${uac?._id}:`, error);
                                        return reject({ status: HTTP?.INTERNAL_SERVER, message: `Failed to update UAC ${uac?._id}` });
                                    })
                                );
                            }
                        }

                        // Update the current UAC if the user is not already assigned
                        if (!chekcUAC?.assignEmployee?.includes(id)) {
                            uacPromises.push(
                                UAC.findByIdAndUpdate(value?.UACId, {
                                    $addToSet: { assignEmployee: id },
                                    $inc: { activeCount: user?.isActive ? 1 : 0 }
                                }).catch(error => {
                                    console.error(`Error adding assignEmployee ${id} to UAC ${value?.UACId}:`, error);
                                    return reject({ status: HTTP?.INTERNAL_SERVER, message: `Failed to update UAC ${value?.UACId}` });
                                })
                            );
                            user.role = chekcUAC?.UACType;
                            userPromises.push(
                                user.save().catch(error => {
                                    console.error(`Error saving user ${id}:`, error);
                                    return reject({ status: HTTP?.INTERNAL_SERVER, message: `Failed to save user ${id}` });
                                })
                            );
                        }
                    }

                    // Execute all UAC and user updates concurrently
                    await Promise.all([...uacPromises, ...userPromises]);
                } catch (error) {
                    console.error('Error processing new assignments:', error);
                    return reject({ status: HTTP?.INTERNAL_SERVER, message: 'Failed to process new assignments' });
                }
            }


            // * Remove Assign
            if (Array.isArray(value?.removeAssign) && value?.removeAssign.length > 0) {
                try {
                    // Ensure unique IDs
                    const uniqueRemoveAssign = Array.from(new Set(value.removeAssign));

                    // Fetch all users
                    const users = await User.find({ _id: { $in: uniqueRemoveAssign } });
                    const userMap = new Map(users.map(user => [user._id.toString(), user]));

                    const uacPromises = [];
                    const userPromises = [];

                    for (const id of uniqueRemoveAssign) {
                        const user = userMap.get(id);

                        if (!user) {
                            return reject({ status: HTTP?.BAD_REQ, message: `User ${id} is not found` });
                        }

                        // Remove from the current UAC if the user is assigned
                        if (chekcUAC?.assignEmployee?.includes(id)) {
                            uacPromises.push(
                                UAC.findByIdAndUpdate(value?.UACId, {
                                    $pull: { assignEmployee: id },
                                    $inc: { activeCount: user?.isActive ? -1 : 0 }
                                }).catch(error => {
                                    console.error(`Error removing assignEmployee ${id} from UAC ${value?.UACId}:`, error);
                                    return reject({ status: HTTP?.INTERNAL_SERVER, message: `Failed to update UAC ${value?.UACId}` });
                                })
                            );
                            user.role = 3;
                            userPromises.push(
                                user.save().catch(error => {
                                    console.error(`Error saving user ${id}:`, error);
                                    return reject({ status: HTTP?.INTERNAL_SERVER, message: `Failed to save user ${id}` });
                                })
                            );
                        }
                    }

                    // Execute all UAC and user updates concurrently
                    await Promise.all([...uacPromises, ...userPromises]);
                } catch (error) {
                    console.error('Error processing remove assignments:', error);
                    return reject({ status: HTTP?.INTERNAL_SERVER, message: 'Failed to process remove assignments' });
                }
            }


            // * If remove all assignEmployee then default owner get have access
            if (chekcUAC?.UACType == 1) {

                // ? fetch after update Admin UAC
                const afterUpdated = await UAC.findOne({ _id: value?.UACId, isActive: true, isDeleted: false, UACType: 1 });
                if (!afterUpdated) return reject({ status: HTTP?.NOT_FOUND, message: "Default Admin UAC not found" });

                // ? if all remove assignEmployee OR some employee but inactive 
                if (afterUpdated?.assignEmployee?.length == 0 || afterUpdated?.activeCount == 0) {

                    // ? find default owner
                    const owner = await User.findOne({ isActive: true, isOwner: true })
                    if (!owner) return reject({ status: HTTP?.NOT_FOUND, message: "Owner not found" });

                    if (!afterUpdated?.assignEmployee?.includes(owner?._id)) {

                        // ? default owner have assign that
                        await UAC.findByIdAndUpdate(value?.UACId, {
                            $push: { assignEmployee: owner?._id },
                            $inc: { activeCount: owner?.isActive ? 1 : 0 }
                        });

                        owner.role = afterUpdated?.UACType;
                        await owner.save();
                        console.log("Owner Assigned");
                    }
                }
            }
            return resolve({ status: HTTP.SUCCESS, message: "UAC assigned Updated" })
        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

// * ----- Clone UAC -----
const cloneUAC = async (data) => {
    console.log(" ========== clone UAC ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data)
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message })

            const UACData = await UAC.findOne({ _id: value?.UACId, isActive: true, isDeleted: false });
            if (!UACData) return reject({ status: HTTP?.BAD_REQ, message: "UAC not found" });


            const cloneData = UACData.toObject();
            delete cloneData?._id;
            cloneData.name = `${UACData?.name}_COPY`;


            const chekcUAC = await UAC.findOne({ name: cloneData?.name, isActive: true, isDeleted: false })
            if (chekcUAC) return reject({ status: HTTP?.BAD_REQ, message: "UAC already exisiting" });

            cloneData.activeCount = 0;
            cloneData.assignEmployee = [];
            cloneData.isDefault = false;

            await UAC.create(cloneData);

            return resolve({ status: HTTP?.SUCCESS, message: "Clone Success" });
        } catch (error) {
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    })
}

// * ----- Delete UAC -----
const deleteUAC = async (data, client) => {
    console.log(" ========== delete UAC ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            data.deletedBy = client?._id?.toString();
            data.isDeleted = true;
            data.deletedOn = Date.now();
            const { error, value } = deleteValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            // Fetch the existing tag from the database
            const existingUAC = await UAC.findOne({ _id: value?.UACId, isActive: true, isDefault: false });
            if (!existingUAC) return reject({ status: HTTP?.NOT_FOUND, message: 'UAC not found' });

            if (existingUAC?.assignEmployee?.length) return resolve({ status: HTTP?.BAD_REQ, message: 'UAC have some user assigned' });

            if (existingUAC?.isDeleted) return resolve({ status: HTTP?.SUCCESS, message: 'UAC already deleted' });

            // Update only the fields that have changed in the existingUAC
            Object.keys(value).forEach(key => {
                if (value[key] && existingUAC[key] != value[key]) {
                    existingUAC[key] = value[key];
                }
            });

            // Save the deleted UAC
            const deletedUAC = await existingUAC.save();

            return resolve({ status: HTTP?.SUCCESS, message: 'UAC deleted successfully', UAC: deletedUAC });

        } catch (error) {
            console.log(error);
            return reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" })
        }
    })
}

module.exports = {
    defaultUAC,

    addUAC,
    showAllUAC,
    deleteUAC,
    assignedUAC,
    cloneUAC
}