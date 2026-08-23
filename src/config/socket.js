const { Server } = require("socket.io");

let io = null;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log(` Client đã kết nối Socket: ${socket.id}`);

        socket.on('join:showtime', (showtimeId) => {
            socket.join(showtimeId);
            console.log(`Client [${socket.id}] đã tham gia Room suất chiếu: ${showtimeId} `);
        });

        socket.on('leave:showtime', (showtimeId) => {
            socket.leave(showtimeId);
            console.log(`Client [${socket.id}] đã rời Room suất chiếu: ${showtimeId}`);
        });

        socket.on('disconnect', () => {
            console.log(`Client đã ngắt kết nối: ${socket.id}`);
        });

    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io chưa được khởi tạo!');
    }
    return io;
};

module.exports = { initSocket, getIO};