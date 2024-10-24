const Redis = require('ioredis');
const redis = Redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
});

redis.on('error', (error) => console.error(`Error: ${error}`));

module.exports = redis;