const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose'); // Changed from mysql2
const bcrypt = require('bcryptjs');
const session = require('express-session');


// 1. MONGODB CONNECTION (Long-form for Jio/Mobile Hotspot)
const mongoURI = "mongodb://ayushadmin:Ayush%401234@flowstate-db.o3ykgrn.mongodb.net/flowstate_db?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
    .then(() => console.log("MongoDB Status: Connected successfully..."))
    .catch(err => console.log("MongoDB Status: Connection Failed ->", err));

mongoose.connect(mongoURI)
    .then(() => console.log("MongoDB Status: Connected successfully..."))
    .catch(err => console.log("MongoDB Status: Connection Failed ->", err));

// 2. DATA SCHEMAS (Replaces CREATE TABLE)
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}));

const Meeting = mongoose.model('Meeting', new mongoose.Schema({
    room_id: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
}));

// 3. MIDDLEWARE
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'flowstate-cosmic-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// 4. AUTHENTICATION API (Updated for Mongoose)
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
        req.session.user = { id: newUser._id, username, email };
        res.redirect('/');
    } catch (e) { 
        res.send("Registration Error. Email might already exist."); 
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = user;
            return res.redirect('/');
        }
        res.send("Invalid Credentials. <a href='/login.html'>Try again</a>");
    } catch (e) { res.status(500).send("Server Error"); }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/login.html');
    });
});

app.get('/api/user-data', (req, res) => {
    if (req.session.user) {
        res.json({ username: req.session.user.username });
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

// 5. SECURE MEETING LOGIC (Updated for Mongoose)
function generateShortId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.post('/create-secure-meeting', async (req, res) => {
    const roomId = generateShortId();
    const { password } = req.body;
    try {
        const newMeeting = new Meeting({ room_id: roomId, password });
        await newMeeting.save();
        res.json({ roomId });
    } catch (err) { res.status(500).json({ error: "DB Error" }); }
});

app.post('/join-meeting', async (req, res) => {
    const { roomId, password } = req.body;
    try {
        const meeting = await Meeting.findOne({ room_id: roomId, password });
        if (meeting) res.json({ success: true });
        else res.json({ success: false, message: "Invalid Room ID or Password" });
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

// 6. NAVIGATION
app.get('/', (req, res) => {
    if (req.session.user) res.sendFile(__dirname + '/public/home.html');
    else res.redirect('/login.html');
});

app.get('/:room', (req, res) => {
    res.sendFile(__dirname + '/public/room.html');
});

// 7. SOCKET.IO (SIGNALING + CHAT)
io.on('connection', socket => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId);
        socket.on('message', (message, userName) => {
            io.to(roomId).emit('createMessage', message, userName);
        });
        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`System is live on port ${PORT}`);
});