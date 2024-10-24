const { mailOption } = require("../constant/constant");
const Asset = require("../models/assestsModel");
const User = require("../models/userModel");
const moment = require('moment');
const { mailQueue } = require("../redis/queue");
const showAuditAsset = async () => {
    try {

        console.time("finding time");

        const ninetyDaysAgo = moment().subtract(90, 'days').endOf('day').toDate();

        let assets = await Asset.find({
            assignTo: { $ne: null },
            isAssign: true,
            lastAuditDate: { $lte: ninetyDaysAgo }
        }).select("name lastAuditDate assetId location").populate("location", "name");

        if (assets?.length > 0) {
            assets = assets?.map(asset => asset?.toObject());
            assets.forEach(asset => {
                if (asset?.lastAuditDate) {
                    asset.lastAuditDate = moment(asset?.lastAuditDate).format('MMM DD, YYYY');
                }
            });

            const systemAdmins = await User.find({ role: 1, isActive: true }).select('name email').exec();

            // const groupedByAssignTo = assets?.reduce((acc, asset) => {
            //     const assignTo = asset?.assignTo;

            //     if (!acc[assignTo]) {
            //         acc[assignTo] = [];
            //     }

            //     acc[assignTo].push(asset);

            //     return acc;
            // }, {});

            // if (groupedByAssignTo && Object.keys(groupedByAssignTo).length > 0) {
            //     // Convert the grouped object into an array
            //     const groupedArray = Object.keys(groupedByAssignTo).map(assignTo => ({
            //         assignTo,
            //         assets: groupedByAssignTo[assignTo],
            //     }));

            //     console.log(groupedArray);
            // }


            await Promise.all(
                systemAdmins.map(async (admin) => {
                    const mailData = {
                        operation: mailOption?.operation?.audit,
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

        console.timeEnd("finding time");
    } catch (error) {
        console.log("error:::::::::::>>>>>>>>>", error);
    }
};

module.exports = showAuditAsset;

