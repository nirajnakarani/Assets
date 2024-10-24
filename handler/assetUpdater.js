// ─────────────────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────────────────
const { assetStatus } = require("../constant/constant");
const Asset = require("../models/assestsModel");

/**
 * @description Checks if the associated assets are available.
 * @param {Array} ids - Array of asset IDs to check.
 * @returns {Promise<boolean>} Returns true if all assets are available, otherwise false.
 */
const checkAssociatedAssets = async (ids) => {
    if (ids && ids?.length > 0) {
        const assets = await Asset.find({ _id: { $in: ids } });
        console.log(assets);

        // Check each asset in the array
        for (const asset of assets) {
            console.log("asset:::::::::::::::>>>>>>>>>>>>>>>");
            
            if (!asset || asset?.status != assetStatus?.available || asset?.isAssociate || asset?.assignAssets || asset?.assignTo || asset?.isAssign) {
                return false;
            }
        }
    }
    return true;
};

/**
 * @description Updates associated assets with the given update object.
 * @param {Array} ids - Array of asset IDs to update.
 * @param {Object} updateObj - Object containing update fields and values.
 */
const updateAssociatedAssets = async (ids, updateObj) => {
    if (ids && ids?.length > 0) {
        await Asset.updateMany(
            { _id: { $in: ids } }, // Match any document with an _id in the ids array
            updateObj, // Apply the update to all matched documents
            { new: true }
        );
    }
};

module.exports = {
    checkAssociatedAssets,
    updateAssociatedAssets
}