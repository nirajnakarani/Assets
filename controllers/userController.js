const { HTTP } = require("../constant/constant");
const User = require("../models/userModel");
const { loginValidation, registerValidation } = require("../validation/user/userValidation");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const showSingleValidationSchema = require("../validation/global/showSingle");
const Asset = require("../models/assestsModel");

// * ----- Default Owner -----
(async function () {
    console.log(" ========== default Owner ========== ");

    return new Promise(async (resolve, reject) => {
        try {
            const ownerData = {
                name: "admin",
                email: "admin@gmail.com",
                password: await bcrypt.hash("admin@123", 10),
                role: 1,
                isOwner: true
            };
            const checkOwner = await User.findOne({ isActive: true, isOwner: true });
            if (checkOwner) return resolve();
            await User(ownerData).save()
            console.log(("Default Owner Save"));
            return resolve()
        } catch (error) {

        }
    })
})();


// * ----- Register -----
const register = async (data) => {
    console.log(" ========== register user ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            // Validate the data using Joi validation
            const { error, value } = registerValidation.validate(data);
            if (error) {
                return resolve({ status: HTTP?.BAD_REQ, message: error.details[0].message });
            }

            // Check if the email already exists in the database
            const checkEmail = await User.findOne({ email: value?.email, isActive: true, });
            if (checkEmail) {
                return resolve({ status: HTTP?.CONFLICT, message: "Email Already Existing" });
            }

            value.password = await bcrypt.hash(value?.password, 10)
            // Save the new user to the database
            await new User(value).save();
            resolve({ status: HTTP?.SUCCESS, message: "Register Success" });

        } catch (error) {
            console.log(error);
            reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    });
}

// * ----- Login -----
const login = async (data) => {
    console.log(" ========== login user ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            // Validate the data using Joi validation
            const { error, value } = loginValidation.validate(data);
            if (error) {
                return resolve({ status: HTTP?.BAD_REQ, message: error.details[0].message });
            }

            // Check if the email exists in the database
            const checkEmail = await User.findOne({ email: value?.email, isActive: true });
            if (!checkEmail) {
                return resolve({ status: HTTP?.NOT_FOUND, message: "Invalid Credential" });
            }
            // Compare the password using bcrypt
            const isPasswordValid = await bcrypt.compare(value.password, checkEmail.password);
            if (!isPasswordValid) {
                return resolve({ status: HTTP?.NOT_FOUND, message: "Invalid Credential" });
            }

            // Generate a JWT token
            const token = jwt.sign({ userId: checkEmail?._id }, process.env.ASSETS_SECRET_KEY);

            resolve({ status: HTTP?.SUCCESS, message: "Login Success", token });

        } catch (error) {
            console.log(error);
            reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    });
}

// * ----- Show All Assigned -----

// ? lookup 
// const showAllAssigned = async () => {
//     return new Promise(async (resolve, reject) => {
//         console.log(" ========== show all assigned ========== ");
//         try {

//             const assignedData = await User.aggregate([

//                 // ? Match users who are active and not deleted
//                 {
//                     $match: {
//                         isActive: true,
//                         // isDeleted: false
//                     }
//                 },

//                 // ? left outer join with assetData table
//                 {
//                     $lookup: {
//                         from: "assetdatas",
//                         localField: "_id",
//                         foreignField: "assignTo",
//                         as: "result"
//                     }
//                 },

//                 // ? Filter the joined assets to include only those that are active and not deleted
//                 {
//                     $addFields: {
//                         result: {
//                             $filter: {
//                                 input: "$result",
//                                 as: "item",
//                                 cond: {
//                                     $and: [
//                                         { $eq: ["$$item.isActive", true] },
//                                         { $eq: ["$$item.isDeleted", false] }
//                                     ]
//                                 }
//                             }
//                         },

//                     }
//                 },

//                 // ? assets's count of user
//                 {
//                     $addFields: {
//                         assetCount: { $size: "$result" }
//                     }
//                 },
//             ])

//             //if (!assignedData) return reject({ status: HTTP?.NOT_FOUND, message: 'Assigned not found' });

//             return resolve({ status: HTTP?.SUCCESS, message: "Here are all Assigned", assignedData })

//         } catch (error) {
//             reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
//         }
//     })
// }



// ? without lookup
const showAllAssigned = async () => {
    console.log(" ========== show all assigned ========== ");
    return new Promise(async (resolve, reject) => {
        try {

            const users = await User.find({ isActive: true }).select("-password");

            const assets = await Asset.find({ isActive: true, isDeleted: false }).populate("createdBy", "name").populate("category", "name").populate("condition", "name").populate("location", "name").populate("tag", "name").populate("vendor", "name");

            const assignedData = []
            for (const user of users) {

                const userAssets = assets?.filter(asset => asset?.assignTo?.toString() === user?._id?.toString());
                console.log(userAssets);

                if (userAssets.length > 0) {
                    assignedData.push({
                        user,
                        assets: userAssets,
                        assetCount: userAssets?.length,
                    })

                }

            }

            if (!assignedData) return reject({ status: HTTP?.NOT_FOUND, message: 'Assigned not found' });

            return resolve({ status: HTTP?.SUCCESS, message: "Here are all Assigned", assignedData })

        } catch (error) {
            reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    })
}


// * ----- Show Assigned -----
// ? lookup
// const showAssigned = async (data) => {
//     return new Promise(async (resolve, reject) => {
//         console.log(" ========== show assigned ========== ");
//         try {

//             const { error, value } = showSingleValidationSchema.validate(data);
//             if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

//             const assignedData = await User.aggregate([

//                 // ? Match users who are active and not deleted
//                 {
//                     $match: {
//                         _id: new ObjectId(value?.userId),
//                         isActive: true,
//                         // isDeleted: false
//                     }
//                 },

//                 // ? left outer join with assetData table
//                 {
//                     $lookup: {
//                         from: "assetdatas",
//                         localField: "_id",
//                         foreignField: "assignTo",
//                         as: "result"
//                     }
//                 },

//                 // ? Filter the joined assets to include only those that are active and not deleted
//                 {
//                     $addFields: {
//                         result: {
//                             $filter: {
//                                 input: "$result",
//                                 as: "item",
//                                 cond: {
//                                     $and: [
//                                         { $eq: ["$$item.isActive", true] },
//                                         { $eq: ["$$item.isDeleted", false] }
//                                     ]
//                                 }
//                             }
//                         },
//                     }
//                 },

//                 // ? assets's count of user
//                 {
//                     $addFields: {
//                         assetCount: { $size: "$result" }
//                     }
//                 },
//             ])
//             if (!assignedData) return reject({ status: HTTP?.NOT_FOUND, message: 'Assigned not found' });

//             return resolve({ status: HTTP?.SUCCESS, message: "Here is Assigned", assignedData })

//         } catch (error) {
//             reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
//         }
//     })
// }

// ? without lookup
const showAssigned = async (data) => {
    console.log(" ========== show assigned ========== ");
    return new Promise(async (resolve, reject) => {
        try {
            const { error, value } = showSingleValidationSchema.validate(data);
            if (error) return reject({ status: HTTP?.BAD_REQ, message: error.details[0].message });

            const user = await User.findOne({ _id: value?.userId, isActive: true }).select("-password");
            if (!user) return reject({ status: HTTP?.NOT_FOUND, message: "User not found" })

            const assets = await Asset.find({ assignTo: user?._id, isActive: true, isDeleted: false }).populate("createdBy", "name").populate("category", "name").populate("condition", "name").populate("location", "name").populate("tag", "name").populate("vendor", "name").populate({
                path: 'associate',
                populate: [
                    {
                        path: 'category', // ? Populate the category field for top-level associates
                        select: "name"
                    },
                    {
                        path: 'tag', // ? Populate the tag field for top-level associates
                        select: "name"
                    },
                    {
                        path: 'location', // ? Populate the location field for top-level associates
                        select: "name"
                    },
                    {
                        path: 'condition', // ? Populate the condition field for top-level associates
                        select: "name"
                    },
                    {
                        path: 'vendor', // ? Populate the venddor field for top-level associates
                        select: "name"
                    },
                    {
                        path: "associate",
                        populate: [
                            {
                                path: 'category', // ? Populate the category field deeper nested associates
                                select: "name"
                            },
                            {
                                path: 'tag', // ? Populate the tag field deeper nested associates
                                select: "name"
                            },
                            {
                                path: 'location', // ? Populate the location field deeper nested associates
                                select: "name"
                            },
                            {
                                path: 'condition', // ? Populate the condition field deeper nested associates
                                select: "name"
                            },
                            {
                                path: 'vendor', // ? Populate the vendor field deeper nested associates
                                select: "name"
                            },
                        ]


                    }
                ]
            });

            const assignedData = {
                user,
                assets,
                assetsCount: assets?.length
            }

            if (!assignedData) return reject({ status: HTTP?.NOT_FOUND, message: 'Assigned not found' });

            return resolve({ status: HTTP?.SUCCESS, message: "Here is Assigned", assignedData })

        } catch (error) {
            reject({ status: HTTP?.INTERNAL_SERVER, message: "INTERNAL SERVER ERROR" });
        }
    })
}


module.exports = {
    register,
    login,

    showAllAssigned,
    showAssigned
}