const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const ROOM_ID = window.location.pathname.split('/')[1];
const myPeer = new Peer();
const myVideo = document.createElement('video');
myVideo.muted = true;

let myVideoStream;
let currentUserName = "Ayush Sharma";

// --- 1. NEW: UPDATE UI ELEMENTS (Display Room ID) ---
const roomIdDisplay = document.getElementById('display-room-id');
if (roomIdDisplay) {
    roomIdDisplay.innerText = ROOM_ID;
}

// Fetch User Identity & Update Top Tag
fetch('/api/user-data').then(res => res.json()).then(data => {
    if(data.username) {
        currentUserName = data.username;
        const nameTag = document.getElementById('user-name-display');
        if(nameTag) nameTag.innerText = currentUserName.toUpperCase();
    }
});

// --- 2. NEW: COPY FUNCTIONALITY ---
window.copyLink = () => {
    navigator.clipboard.writeText(ROOM_ID).then(() => {
        // Find the pill for visual feedback
        const pill = document.querySelector('.room-info-pill');
        if(pill) {
            const originalBorder = pill.style.borderColor;
            pill.style.borderColor = "#8ab4f8";
            pill.style.boxShadow = "0 0 15px rgba(138, 180, 248, 0.4)";
            
            alert("Room ID: " + ROOM_ID + " copied to clipboard!");
            
            setTimeout(() => {
                pill.style.borderColor = originalBorder;
                pill.style.boxShadow = "none";
            }, 1000);
        }
    });
};

// --- 3. EXISTING VIDEO LOGIC ---
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    myPeer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');
        call.on('stream', userStream => addVideoStream(video, userStream));
    });

    socket.on('user-connected', userId => {
        setTimeout(() => connectToNewUser(userId, stream), 1000);
    });
});

myPeer.on('open', id => socket.emit('join-room', ROOM_ID, id));

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', userStream => addVideoStream(video, userStream));
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => video.play());
    videoGrid.append(video);
}

// --- 4. EXISTING CHAT BRIDGE ---
window.sendMessage = () => {
    const input = document.getElementById('chat-input');
    if (input.value.trim()) {
        socket.emit('message', input.value, currentUserName);
        input.value = '';
    }
}

socket.on('createMessage', (msg, user) => {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.innerHTML = `<b style="color:#8ab4f8">${user}</b><br>${msg}`;
    document.getElementById('chat-messages').append(msgDiv);
    document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
});

// --- 5. NEW: CONTROL BUTTON LOGIC ---
window.toggleAudio = () => {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    myVideoStream.getAudioTracks()[0].enabled = !enabled;
    document.getElementById('mute-btn').classList.toggle('active-red');
}

window.toggleVideo = () => {
    const enabled = myVideoStream.getVideoTracks()[0].enabled;
    myVideoStream.getVideoTracks()[0].enabled = !enabled;
    document.getElementById('video-btn').classList.toggle('active-red');
}

window.leaveCall = () => {
    window.location.href = '/';
}