const { Queue, Worker } = require("bullmq");
const { redisConnection } = require("../constant/constant");
const pdfQueue = new Queue('pdfQueue', redisConnection);
const mailQueue = new Queue('mailQueue', redisConnection);
const excelQueue = new Queue('excelQueue', redisConnection);
const fs = require("fs");
const path = require("path");
const sendMail = require("../handler/sendMail");
const pdfWorker = new Worker('pdfQueue', async (job) => {
    // console.log(job?.data?.filePath);
    const { filePath } = job?.data

    // setTimeout(() => {
    //     if (fs.existsSync(filePath) && filePath) {
    //         fs.unlinkSync(filePath); // Delete the file
    //     }
    // }, 60000);
    let progress = 0;

    // Create a new Promise to handle the progress bar and file deletion
    await new Promise((resolve) => {
        const interval = setInterval(async () => {
            progress += 100 / 60; // Increment progress by 1.67% every second
            progress = Math.min(progress, 100); // Ensure progress does not exceed 100%
            await job.updateProgress(Math.round(progress)); // Update job progress in Redis, rounded to the integer

            if (progress >= 100) {
                clearInterval(interval); // Stop the interval when progress reaches 100%

                if (fs.existsSync(filePath) && filePath) {
                    fs.unlinkSync(filePath); // Delete the file
                }
                resolve(); // Resolve the Promise
            }
        }, 1000); // Update progress every second
    });
    // await job.remove();
}, {
    connection: redisConnection,
    lockDuration: 60000,
    attempts: 3, // Retry up to 3 times
    backoff: {
        type: 'fixed',
        delay: 10000 // 10 seconds delay between retries
    }
});

const excelWorker = new Worker('excelQueue', async (job) => {
    // console.log(job?.data?.filePath);
    const { filePath } = job?.data

    // setTimeout(() => {
    //     if (fs.existsSync(filePath) && filePath) {
    //         fs.unlinkSync(filePath); // Delete the file
    //     }
    // }, 60000);
    let progress = 0;

    // Create a new Promise to handle the progress bar and file deletion
    await new Promise((resolve) => {
        const interval = setInterval(async () => {
            progress += 100 / 60; // Increment progress by 1.67% every second
            progress = Math.min(progress, 100); // Ensure progress does not exceed 100%
            await job.updateProgress(Math.round(progress)); // Update job progress in Redis, rounded to the nearest integer

            if (progress >= 100) {
                clearInterval(interval); // Stop the interval when progress reaches 100%

                if (fs.existsSync(filePath) && filePath) {
                    fs.unlinkSync(filePath); // Delete the file
                }
                resolve(); // Resolve the Promise
            }
        }, 1000); // Update progress every second

    });
    // await job.remove();
}, {
    connection: redisConnection,
    lockDuration: 60000,
    attempts: 3, // Retry up to 3 times
    backoff: {
        type: 'fixed',
        delay: 10000 // 10 seconds delay between retries
    }
})

const mailWorker = new Worker('mailQueue', async (job) => {
    try {
        // const { operation, asset, user } = job?.data
        console.log("job.data::::::::>>>>>>>>", job.data);
        await new Promise(resolve => setTimeout(async () => {
            await sendMail(job?.data);
            resolve()
        }, 5000));

    } catch (error) {
        console.log("mail worker error::::::::>>>>>>>>", error);
    }
}, {
    connection: redisConnection,
    lockDuration: 60000,
    attempts: 3, // Retry up to 3 times
    backoff: {
        type: 'fixed',
        delay: 10000 // 10 seconds delay between retries
    }
})


module.exports = {
    pdfQueue,
    excelQueue,
    mailQueue
}