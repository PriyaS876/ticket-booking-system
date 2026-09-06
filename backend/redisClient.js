const redis = require('redis');

const client = redis.createClient({
  socket: {
    host: 'localhost',
    port: 6379
  }
});

client.on('error', (err) => console.error('Redis Error:', err));

client.connect().then(() => {
  console.log('Redis connected!');
});

module.exports = client;