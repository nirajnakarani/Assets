require("dotenv").config();
const nodemailer = require("nodemailer");
const path = require("path");
const ejs = require('ejs');
const fs = require("fs");
const { mailOption } = require("../constant/constant");
const handlebars = require('handlebars');
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

const sendMail = async (data) => {
    try {
        let html, user, operation, asset;
        if (data?.operation == mailOption?.operation?.expire || data?.operation == mailOption?.operation?.audit) {
            const { assets } = data;
            user = data?.user;
            operation = data?.operation;
            html = await ejs.renderFile(path.join(__dirname, "..", 'views/expireAssetOrAuditMail.ejs'), { operation, assets, user });
        }
        else {
            asset = data?.asset;
            user = data?.user;
            operation = data?.operation;
            html = await ejs.renderFile(path.join(__dirname, "..", 'views/mailTemplate.ejs'), { operation, asset, user });
        }
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: user?.email,
            subject: `${operation.charAt(0).toUpperCase() + operation.slice(1)} Asset Notification`,
            html: html,
        }

        // Check if the operation is not 'expire' or 'audit'
        if (data?.operation !== 'expire' && data?.operation !== 'audit') {
            mailOptions.attachments = asset?.files?.map((file, index) => ({
                filename: file?.filename,
                path: file?.path,
                cid: `image${index + 1}`,
            }));
        }

        const info = await transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: %s', info.messageId);
        });


    } catch (error) {
        console.log("mail error::::::::::::::::::>>>>>>>>>>", error);

    }
}

module.exports = sendMail;