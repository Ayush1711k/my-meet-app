const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const ROOM_ID = window.location.pathname.split('/')[1];
const myPeer = new Peer();
const myVideo = document.createElement('video');
myVideo.muted = true;

let myVideoStream;
const peers = {};

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    myPeer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
        });
    });

    socket.on('user-connected', userId => {
        connectToNewUser(userId, stream);
        updateParticipants(1);
    });
});

// CHAT LOGIC
function sendMessage() {
    const msgInput = document.getElementById('chat-message');
    if (msgInput.value.trim() !== "") {
        socket.emit('message', msgInput.value);
        msgInput.value = '';
    }
}

// Listen for messages from server
socket.on('createMessage', message => {
    const msgContainer = document.getElementById('all-messages');
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.innerHTML = `<b>User:</b><br>${message}`;
    msgContainer.append(msgDiv);
    
    // Auto-scroll to bottom
    const chatWindow = document.getElementById('chat-window');
    chatWindow.scrollTop = chatWindow.scrollHeight;
});

// Support "Enter" key for chat
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});

socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close();
    updateParticipants(-1);
});

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
    call.on('close', () => { video.remove(); });
    peers[userId] = call;
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => { video.play(); });
    videoGrid.append(video);
}

// UI Features
function updateParticipants(n) {
    const count = document.getElementById('participant-count');
    count.innerText = parseInt(count.innerText) + n;
}

function leaveCall() {
    // 1. Kill the video/audio streams so the camera light turns off
    if (myVideoStream) {
        myVideoStream.getTracks().forEach(track => track.stop());
    }

    // 2. Destroy the PeerJS connection so it doesn't try to reconnect
    if (myPeer) {
        myPeer.destroy();
    }

    // 3. Manually disconnect from Socket.io
    if (socket) {
        socket.disconnect();
    }

    // 4. Send the user away from the room URL
    window.location.href = "/"; // Or redirect to a 'Meeting Ended' page
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied!");
}

const toggleAudio = () => {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    myVideoStream.getAudioTracks()[0].enabled = !enabled;
    document.getElementById('mute-btn').classList.toggle('active-red');
}

const toggleVideo = () => {
    const enabled = myVideoStream.getVideoTracks()[0].enabled;
    myVideoStream.getVideoTracks()[0].enabled = !enabled;
    document.getElementById('video-btn').classList.toggle('active-red');
}

setInterval(() => {
    document.getElementById('clock').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}, 1000);

document.getElementById('room-id-display').innerText = "Room: " + ROOM_ID.substring(0, 6);