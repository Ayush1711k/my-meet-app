const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');

// 1. DATABASE CONNECTION
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Ayush@1234', 
    database: 'flowstate_db' 
});

db.connect(err => {
    if (err) console.log("MySQL Status: Connection Failed ->", err.message);
    else console.log("MySQL Status: Connected successfully...");
});

// 2. MIDDLEWARE
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'flowstate-cosmic-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// 3. AUTHENTICATION API
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
        db.query(sql, [username, email, hashedPassword], (err, result) => {
            if (err) return res.send("Registration Error. Email might already exist.");
            req.session.user = { id: result.insertId, username, email };
            res.redirect('/');
        });
    } catch (e) { res.status(500).send("Server Error"); }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (results.length > 0 && await bcrypt.compare(password, results[0].password)) {
            req.session.user = results[0];
            return res.redirect('/');
        }
        res.send("Invalid Credentials. <a href='/login.html'>Try again</a>");
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/login.html');
    });
});

app.get('/api/user-data', (req, res) => {
    if (req.session.user) {
        // This MUST match the column name in your MySQL table
        res.json({ username: req.session.user.username });
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

// 4. SECURE MEETING LOGIC
function generateShortId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.post('/create-secure-meeting', (req, res) => {
    const roomId = generateShortId();
    const { password } = req.body;
    db.query("INSERT INTO meetings (room_id, password) VALUES (?, ?)", [roomId, password], (err) => {
        if (err) return res.status(500).json({ error: "DB Error" });
        res.json({ roomId });
    });
});

app.post('/join-meeting', (req, res) => {
    const { roomId, password } = req.body;
    db.query("SELECT * FROM meetings WHERE room_id = ? AND password = ?", [roomId, password], (err, results) => {
        if (results.length > 0) res.json({ success: true });
        else res.json({ success: false, message: "Invalid Room ID or Password" });
    });
});

// 5. NAVIGATION
app.get('/', (req, res) => {
    if (req.session.user) res.sendFile(__dirname + '/public/home.html');
    else res.redirect('/login.html');
});

app.get('/:room', (req, res) => {
    res.sendFile(__dirname + '/public/room.html');
});

// 6. SOCKET.IO (SIGNALING + CHAT)
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

// Use Render's port or default to 3000
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`System is live on port ${PORT}`);
});