const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');

// This tells Express where to find CSS/JS
app.use(express.static('public'));

// 1. LANDING PAGE (Must be first)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/home.html');
});

// 2. CREATE NEW MEETING
app.get('/new-meeting', (req, res) => {
    res.redirect(`/${uuidV4()}`);
});

// 3. EXIT PAGE
app.get('/left', (req, res) => {
    res.sendFile(__dirname + '/public/left.html');
});

// 4. THE MEETING ROOM (Clean version for Node v22)
app.get('/:room', (req, res) => {
    // If for some reason 'room' is empty (it shouldn't be here), 
    // it will still serve room.html, but since '/' is handled above,
    // this will only trigger if there is a value in the URL.
    res.sendFile(__dirname + '/public/room.html');
});

io.on('connection', (socket) => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.userId = userId;
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

server.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVER_STATUS: SUCCESS`);
    console.log(`Listening on Port: ${PORT}`);
});