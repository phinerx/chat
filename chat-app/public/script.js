const socket = io();

let username = prompt("Enter your username:", "User");
if (!username) {
    username = "User";
}

let localStream;
let remoteStream;
let peerConnection;
const callControls = document.getElementById('call-controls');
const callInterface = document.getElementById('call-interface');
const endCallButton = document.getElementById('end-call');
const muteButton = document.getElementById('mute-microphone');
const remoteAudio = document.getElementById('remote-audio');

const form = document.getElementById('message-form');
const input = document.getElementById('message-input');
const messages = document.getElementById('messages');
const usersList = document.getElementById('users');

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

// When connected to the server
socket.on('connect', () => {
    socket.emit('join', username);
});

// Update user list
socket.on('user list', (users) => {
    usersList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user;
        
        const callButton = document.createElement('button');
        callButton.textContent = 'Call';
        callButton.classList.add('call-button');
        callButton.addEventListener('click', () => initiateCall(user));

        li.appendChild(callButton);
        usersList.appendChild(li);
    });
});

// Handle form submission for sending chat messages
form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
        socket.emit('chat message', { username, message: input.value });
        input.value = '';
    }
});

// Display incoming chat messages
socket.on('chat message', (data) => {
    const item = document.createElement('div');
    item.classList.add('message', data.username.toLowerCase().replace(/\s+/g, ''));
    item.textContent = `${data.username}: ${data.message}`;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
});

// Handle incoming call
socket.on('call', async (data) => {
    if (confirm(`Call from ${data.username}. Accept?`)) {
        await startCall(data.from);
        socket.emit('answer', { to: data.from });
    }
});

// Handle call answer
socket.on('answer', async (data) => {
    await startCall(data.from);
});

// Handle incoming ICE candidates
socket.on('ice-candidate', (data) => {
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});

// Start a call with the specified remote user
async function startCall(remoteId) {
    peerConnection = new RTCPeerConnection(configuration);

    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { candidate: event.candidate, to: remoteId });
        }
    };

    peerConnection.ontrack = (event) => {
        if (!remoteStream) {
            remoteStream = new MediaStream();
            remoteAudio.srcObject = remoteStream;
        }
        remoteStream.addTrack(event.track);
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit('call', { to: remoteId, offer: offer });
    callInterface.style.display = 'flex';
    callControls.style.display = 'flex';
}

// End the current call
endCallButton.addEventListener('click', () => {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        localStream.getTracks().forEach(track => track.stop());
        remoteAudio.srcObject = null;
        callControls.style.display = 'none';
        callInterface.style.display = 'none';
    }
});

// Mute/unmute microphone
muteButton.addEventListener('click', () => {
    if (localStream) {
        localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
        muteButton.textContent = localStream.getAudioTracks()[0].enabled ? 'Mute' : 'Unmute';
    }
});

// Initiate a call to the specified user
function initiateCall(user) {
    socket.emit('call', { to: user });
}
