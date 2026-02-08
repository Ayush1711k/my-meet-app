const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');

app.use(express.static('public'));

// 1. HOME PAGE (Must be first!)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/home.html');
});

// 2. NEW MEETING TRIGGER
app.get('/new-meeting', (req, res) => {
    res.redirect(`/${uuidV4()}`);
});

// 3. EXIT PAGE
app.get('/left', (req, res) => {
    res.sendFile(__dirname + '/public/left.html');
});

// 4. VIDEO ROOM (Must be last!)
// The ":" tells the server "anything after the slash is a room ID"
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