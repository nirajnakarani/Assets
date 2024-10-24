const Asset = require("../models/assestsModel");
const moment = require('moment'); // Assuming you're using moment.js for date handling
const User = require("../models/userModel");
const { mailOption } = require("../constant/constant");
const { mailQueue } = require("../redis/queue");
const ExpireMailAlert = require("../models/expireMailAlert");

// Get today's date with the time set to 00:00:00 and 23:59:59
const startOfDay = moment().startOf('day').toDate();
const endOfDay = moment().endOf('day').toDate();

const expireAsset = async () => {
    return new Promise(async (resolve, reject) => {
        try {

            let assets = await Asset.find({
                expireDateWarranty: {
                    $gte: startOfDay,
                    $lte: endOfDay
                },
                isActive: true,
                isDeleted: false
            }).select("name expireDateWarranty assetId location").populate("location", "name");
            if (assets) {
                assets = assets?.map(asset => asset?.toObject());
                assets.forEach(asset => {
                    if (asset?.expireDateWarranty) {
                        asset.expireDateWarranty = moment(asset?.expireDateWarranty).format('MMM DD, YYYY');
                    }
                });

                const AllLocationHead = await ExpireMailAlert.findOne({ isDefault: true }).select("userList").populate("userList", "name email")
                const locationIds = assets.map(asset => asset?.location?._id);

                const locationHead = await ExpireMailAlert.find({
                    location: {
                        $in: locationIds
                    },
                    isActive: true,
                    isDeleted: false
                }).select("location userList").populate("location", "name").populate("userList", "name email")


                const assetsByLocation = assets.reduce((acc, asset) => {
                    const locationId = asset?.location?._id.toString();
                    if (!acc[locationId]) {
                        acc[locationId] = [];
                    }
                    acc[locationId].push(asset);
                    return acc;
                }, {});

                // Step 5: Map locationHead to grouped assets and create the desired structure
                const data = locationHead.map(alert => {
                    const locationId = alert.location._id.toString();
                    const matchingAssets = assetsByLocation[locationId] || [];

                    return {
                        location: alert.location, // Location info from ExpireMailAlert
                        userList: alert.userList,  // User list from ExpireMailAlert
                        assets: matchingAssets     // Corresponding assets for this location
                    };
                });

                // console.log(data);
                await Promise.all(
                    data?.map(async (val) => {
                        val?.userList?.forEach(async (admin) => {
                            const mailData = {
                                operation: mailOption?.operation?.expire,
                                assets: val?.assets,
                                user: {
                                    name: admin?.name,
                                    email: admin?.email
                                }
                            };
                            console.log("admin::::::::::::>>>>>>>>>>");
                            await mailQueue.add("mailTask", mailData, { delay: 10000 });
                        })

                    })
                );
                if (AllLocationHead?.userList?.length) {

                    await Promise.all(
                        AllLocationHead?.userList?.map(async (admin) => {
                            const mailData = {
                                operation: mailOption?.operation?.expire,
                                assets: assets,
                                user: {
                                    name: admin?.name,
                                    email: admin?.email
                                },
                            };
                            console.log("admin::::::::::::>>>>>>>>>>");
                            await mailQueue.add("mailTask", mailData, { delay: 10000 });
                        })
                    );
                }
            }
            // console.log("expire asset:::::::::>>>>>>>>>>", data);

            // if (assets) {
            //     assets = assets?.map(asset => asset?.toObject());
            //     assets.forEach(asset => {
            //         if (asset?.expireDateWarranty) {
            //             asset.expireDateWarranty = moment(asset?.expireDateWarranty).format('DD-MM-YYYY');
            //         }
            //     });

            //     const systemAdmins = await User.find({ role: 1, isActive: true }).select('name email').exec();

            //     // Add mail tasks for each admin concurrently
            //     await Promise.all(
            //         systemAdmins.map(async (admin) => {
            //             const mailData = {
            //                 operation: mailOption?.operation?.expire,
            //                 assets: assets,
            //                 user: {
            //                     name: admin?.name,
            //                     email: admin?.email
            //                 },
            //             };
            //             console.log("admin::::::::::::>>>>>>>>>>");
            //             await mailQueue.add("mailTask", mailData, { delay: 10000 });
            //         })
            //     );
            // }

        } catch (error) {
            console.log("expire Asset error:::::::::>>>>>>", error);

        }
    })
}
module.exports = expireAsset