require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./config/socket');
require('./config/redis');
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
    console.log(`Server run in : http://localhost:${PORT}`);
    console.log(`Socket.io Realtime đã sẵn sàng kết nối!`);
});
