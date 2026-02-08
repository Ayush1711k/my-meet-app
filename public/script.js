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

socket.on('createMessage', message => {
    const msgContainer = document.getElementById('all-messages');
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.innerHTML = `<b>User:</b><br>${message}`;
    msgContainer.append(msgDiv);
    
    const chatWindow = document.getElementById('chat-window');
    chatWindow.scrollTop = chatWindow.scrollHeight;
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});

socket.on('user-disconnected', userId => {
    // 1. Close the connection
    if (peers[userId]) peers[userId].close();

    // 2. Find the video box using the "Label" we created in Step 1 and remove it
    const videoToRemove = document.getElementById(userId);
    if (videoToRemove) {
        videoToRemove.remove();
    }

    updateParticipants(-1);
});

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    
    // This is the "Label": We save the userId on the video element
    video.id = userId; 

    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });

    call.on('close', () => {
        video.remove();
    });

    peers[userId] = call;
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => { video.play(); });
    videoGrid.append(video);
}

function updateParticipants(n) {
    const count = document.getElementById('participant-count');
    if (count) {
        count.innerText = parseInt(count.innerText || "0") + n;
    }
}

// OPTIMIZED LEAVE CALL FUNCTION
function leaveCall() {
    // 1. Stop all network activity
    window.stop();

    // 2. Stop camera and microphone
    if (myVideoStream) {
        myVideoStream.getTracks().forEach(track => track.stop());
    }

    // 3. Destroy PeerJS and Socket connections
    if (myPeer) myPeer.destroy();
    if (socket) socket.disconnect();

    // 4. Attempt to close the tab
    window.close();

    // 5. Fallback: If the browser blocks window.close(), redirect to a "Good Bye" page
    setTimeout(() => {
        window.location.replace("https://www.google.com");
    }, 100);
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
    const clock = document.getElementById('clock');
    if (clock) {
        clock.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}, 1000);

const roomDisplay = document.getElementById('room-id-display');
if (roomDisplay) {
    roomDisplay.innerText = "Room: " + ROOM_ID.substring(0, 6);
}