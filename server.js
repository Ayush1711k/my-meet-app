const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');

app.use(express.static('public'));

/// 1. When someone goes to your website link, show the Landing Page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/home.html');
});

// 2. When someone clicks "New Meeting", create an ID and move them
app.get('/new-meeting', (req, res) => {
    res.redirect(`/${uuidV4()}`);
});

// 3. When there is a Room ID in the URL, show the Video Room
app.get('/:room', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.userId = userId; // Save ID for clean disconnects
        socket.to(roomId).emit('user-connected', userId);

        socket.on('message', (message) => {
            io.to(roomId).emit('createMessage', message);
        });

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', socket.userId);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});