const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

['ready', 'connect', 'reconnecting', 'error', 'end', 'warning'].forEach(
  (v) => {
    redisClient.on(v, (err) => {
      console.log(`REDIS: ${v}: ${err || 'done'}`);
    });
  },
);

module.exports = redisClient;
