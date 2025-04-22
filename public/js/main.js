// Global variables
let socket;
let localStream;
let peers = {};
let roomId;
let username;
let localUserId;
let isAudioEnabled = true;
let isVideoEnabled = true;
let isChatPanelOpen = true;
let screenShareStream;
let isScreenSharing = false;

// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const appScreen = document.getElementById('app-screen');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const roomIdInput = document.getElementById('room-id');
const usernameInput = document.getElementById('username');
const roomIdDisplay = document.getElementById('room-id-display');
const copyRoomIdBtn = document.getElementById('copy-room-id');
const leaveBtn = document.getElementById('leave-btn');
const videoContainer = document.getElementById('video-container');
const localVideo = document.getElementById('local-video');
const toggleAudioBtn = document.getElementById('toggle-audio-btn');
const toggleVideoBtn = document.getElementById('toggle-video-btn');
const shareScreenBtn = document.getElementById('share-screen-btn');
const toggleChatPanelBtn = document.getElementById('toggle-chat-panel-btn');
const chatPanel = document.getElementById('chat-panel');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const toggleChatBtn = document.getElementById('toggle-chat-btn');
const localAudioIndicator = document.getElementById('local-audio-indicator');
const localVideoIndicator = document.getElementById('local-video-indicator');

// Ice servers configuration
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        {
            urls: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
        }
    ]
};

// Initialize the application
function init() {
    socket = io();
    attachEventListeners();
}

// Attach event listeners to DOM elements
function attachEventListeners() {
    createRoomBtn.addEventListener('click', createRoom);
    joinRoomBtn.addEventListener('click', joinRoom);
    roomIdInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
    usernameInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && usernameInput.value.trim() !== '') createRoom();
    });
    copyRoomIdBtn.addEventListener('click', copyRoomId);
    leaveBtn.addEventListener('click', leaveRoom);
    toggleAudioBtn.addEventListener('click', toggleAudio);
    toggleVideoBtn.addEventListener('click', toggleVideo);
    shareScreenBtn.addEventListener('click', toggleScreenShare);
    toggleChatPanelBtn.addEventListener('click', () => {
        chatPanel.classList.toggle('hidden');
        isChatPanelOpen = !chatPanel.classList.contains('hidden');
    });
    chatInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
            sendMessage();
        }
    });
    sendMessageBtn.addEventListener('click', sendMessage);
    toggleChatBtn.addEventListener('click', () => {
        chatPanel.classList.toggle('hidden');
        toggleChatBtn.querySelector('i').classList.toggle('fa-chevron-right');
        toggleChatBtn.querySelector('i').classList.toggle('fa-chevron-left');
    });
}

// Create a new room
async function createRoom() {
    username = usernameInput.value.trim();
    if (!username) {
        alert('Please enter your name');
        return;
    }

    try {
        const response = await fetch('/create-room');
        const data = await response.json();
        roomId = data.roomId;
        
        joinRoomSetup();
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Failed to create room. Please try again.');
    }
}

// Join an existing room
async function joinRoom() {
    username = usernameInput.value.trim();
    const roomIdValue = roomIdInput.value.trim();
    
    if (!username) {
        alert('Please enter your name');
        return;
    }
    
    if (!roomIdValue) {
        alert('Please enter a room ID');
        return;
    }
    
    try {
        const response = await fetch(`/room/${roomIdValue}`);
        if (response.ok) {
            roomId = roomIdValue;
            joinRoomSetup();
        } else {
            alert('Room not found. Please check the room ID and try again.');
        }
    } catch (error) {
        console.error('Error joining room:', error);
        alert('Failed to join room. Please try again.');
    }
}

// Setup after joining a room
async function joinRoomSetup() {
    try {
        // Get local media stream
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        });
        
        // Display local stream
        localVideo.srcObject = localStream;
        
        // Switch from welcome screen to app screen
        welcomeScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        
        // Display room ID
        roomIdDisplay.textContent = roomId;
        
        // Generate a unique user ID
        localUserId = generateUserId();
        
        // Set up socket events
        setupSocketEvents();
        
        // Join the room
        socket.emit('join-room', roomId, localUserId, username);
        
        // Update UI for media controls
        updateLocalMediaUI();
        
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Failed to access camera and microphone. Please ensure you have given permission and try again.');
    }
}

// Setup socket event listeners
function setupSocketEvents() {
    // When a new user connects
    socket.on('user-connected', (userId, userName) => {
        console.log(`User connected: ${userName} (${userId})`);
        addSystemMessage(`${userName} joined the session`);
        
        // Create a peer connection for the new user
        createPeerConnection(userId, userName);
        
        // Call the new user
        callUser(userId);
    });
    
    // When a user disconnects
    socket.on('user-disconnected', (userId, userName) => {
        console.log(`User disconnected: ${userName} (${userId})`);
        addSystemMessage(`${userName} left the session`);
        
        // Close and remove the peer connection
        if (peers[userId]) {
            peers[userId].connection.close();
            delete peers[userId];
        }
        
        // Remove the video element
        const videoElement = document.getElementById(`video-${userId}`);
        if (videoElement) {
            videoElement.parentElement.remove();
        }
    });
    
    // When receiving existing users in the room
    socket.on('existing-users', (users) => {
        console.log('Existing users:', users);
        
        users.forEach(user => {
            createPeerConnection(user.id, user.username);
            callUser(user.id);
        });
    });
    
    // When receiving a WebRTC signal
    socket.on('signal', async ({ userId, from, signal }) => {
        try {
            // If it's a new offer (someone calling us)
            if (signal.type === 'offer') {
                if (!peers[userId]) {
                    // Create peer connection if it doesn't exist
                    createPeerConnection(userId);
                }
                
                // Set the remote description
                await peers[userId].connection.setRemoteDescription(new RTCSessionDescription(signal));
                
                // Create an answer
                const answer = await peers[userId].connection.createAnswer();
                await peers[userId].connection.setLocalDescription(answer);
                
                // Send the answer back
                socket.emit('signal', {
                    userId: localUserId,
                    to: from,
                    signal: answer
                });
            } 
            // If it's an answer to our offer
            else if (signal.type === 'answer') {
                await peers[userId].connection.setRemoteDescription(new RTCSessionDescription(signal));
            } 
            // If it's an ICE candidate
            else if (signal.type === 'candidate') {
                await peers[userId].connection.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
        } catch (error) {
            console.error('Error handling signal:', error);
        }
    });
    
    // When receiving a chat message
    socket.on('receive-message', (message) => {
        displayMessage(message);
    });
    
    // When a user toggles their media
    socket.on('user-toggle-media', (userId, type, enabled) => {
        updateRemoteMediaUI(userId, type, enabled);
    });
}

// Create a peer connection for a user
function createPeerConnection(userId, userName) {
    // Create a new RTCPeerConnection
    const peerConnection = new RTCPeerConnection(iceServers);
    
    // Add local tracks to the connection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', {
                userId: localUserId,
                to: peers[userId] ? peers[userId].socketId : null,
                signal: {
                    type: 'candidate',
                    candidate: event.candidate
                }
            });
        }
    };
    
    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
        // Create or get video element for this peer
        let videoElement = document.getElementById(`video-${userId}`);
        
        if (!videoElement) {
            // Create new video container
            const videoContainer = document.createElement('div');
            videoContainer.className = 'video-item';
            videoContainer.id = `container-${userId}`;
            
            // Create video element
            videoElement = document.createElement('video');
            videoElement.id = `video-${userId}`;
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            
            // Create video info container
            const videoInfo = document.createElement('div');
            videoInfo.className = 'video-info';
            
            // Create name display
            const nameDisplay = document.createElement('span');
            nameDisplay.className = 'video-name';
            nameDisplay.textContent = userName || `User ${userId.substring(0, 5)}`;
            
            // Create status indicators
            const statusIndicators = document.createElement('div');
            statusIndicators.className = 'video-status';
            
            const audioIndicator = document.createElement('i');
            audioIndicator.id = `audio-${userId}`;
            audioIndicator.className = 'fas fa-microphone';
            
            const videoIndicator = document.createElement('i');
            videoIndicator.id = `video-${userId}`;
            videoIndicator.className = 'fas fa-video';
            
            // Assemble the elements
            statusIndicators.appendChild(audioIndicator);
            statusIndicators.appendChild(videoIndicator);
            
            videoInfo.appendChild(nameDisplay);
            videoInfo.appendChild(statusIndicators);
            
            videoContainer.appendChild(videoElement);
            videoContainer.appendChild(videoInfo);
            
            // Add to the video grid
            document.getElementById('video-container').appendChild(videoContainer);
        }
        
        // Set the stream as source for the video element
        if (videoElement.srcObject !== event.streams[0]) {
            videoElement.srcObject = event.streams[0];
        }
    };
    
    // Get the socket ID for signaling
    const socketId = socket.id;
    
    // Store the peer connection
    peers[userId] = {
        connection: peerConnection,
        socketId: socketId,
        username: userName
    };
    
    return peerConnection;
}

// Call a user by sending an offer
async function callUser(userId) {
    try {
        if (!peers[userId]) return;
        
        // Create an offer
        const offer = await peers[userId].connection.createOffer();
        await peers[userId].connection.setLocalDescription(offer);
        
        // Send the offer to the user
        socket.emit('signal', {
            userId: localUserId,
            to: peers[userId].socketId,
            signal: offer
        });
    } catch (error) {
        console.error('Error calling user:', error);
    }
}

// Toggle local audio
function toggleAudio() {
    if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            isAudioEnabled = !audioTracks[0].enabled;
            audioTracks[0].enabled = isAudioEnabled;
            
            // Update UI
            toggleAudioBtn.classList.toggle('active', !isAudioEnabled);
            if (isAudioEnabled) {
                toggleAudioBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                localAudioIndicator.className = 'fas fa-microphone';
            } else {
                toggleAudioBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                localAudioIndicator.className = 'fas fa-microphone-slash';
            }
            
            // Notify other users
            socket.emit('toggle-media', roomId, localUserId, 'audio', isAudioEnabled);
        }
    }
}

// Toggle local video
function toggleVideo() {
    if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length > 0) {
            isVideoEnabled = !videoTracks[0].enabled;
            videoTracks[0].enabled = isVideoEnabled;
            
            // Update UI
            toggleVideoBtn.classList.toggle('active', !isVideoEnabled);
            if (isVideoEnabled) {
                toggleVideoBtn.innerHTML = '<i class="fas fa-video"></i>';
                localVideoIndicator.className = 'fas fa-video';
            } else {
                toggleVideoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
                localVideoIndicator.className = 'fas fa-video-slash';
            }
            
            // Notify other users
            socket.emit('toggle-media', roomId, localUserId, 'video', isVideoEnabled);
        }
    }
}

// Toggle screen sharing
async function toggleScreenShare() {
    try {
        if (!isScreenSharing) {
            // Start screen sharing
            screenShareStream = await navigator.mediaDevices.getDisplayMedia({
                video: true
            });
            
            // Replace video track with screen sharing track
            const videoTrack = screenShareStream.getVideoTracks()[0];
            
            // Replace the track in all peer connections
            Object.values(peers).forEach(peer => {
                const senders = peer.connection.getSenders();
                const videoSender = senders.find(sender => 
                    sender.track && sender.track.kind === 'video'
                );
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                }
            });
            
            // Replace local video stream
            const oldVideoTrack = localStream.getVideoTracks()[0];
            if (oldVideoTrack) {
                localStream.removeTrack(oldVideoTrack);
                oldVideoTrack.stop();
            }
            localStream.addTrack(videoTrack);
            
            // Update local video display
            localVideo.srcObject = screenShareStream;
            
            // Update button UI
            shareScreenBtn.innerHTML = '<i class="fas fa-desktop"></i>';
            shareScreenBtn.classList.add('active');
            
            // Track when screen sharing ends
            videoTrack.onended = () => {
                toggleScreenShare();
            };
            
            isScreenSharing = true;
        } else {
            // Stop screen sharing
            if (screenShareStream) {
                screenShareStream.getTracks().forEach(track => track.stop());
            }
            
            // Restart camera video
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
            
            const videoTrack = newStream.getVideoTracks()[0];
            
            // Replace the track in all peer connections
            Object.values(peers).forEach(peer => {
                const senders = peer.connection.getSenders();
                const videoSender = senders.find(sender => 
                    sender.track && sender.track.kind === 'video'
                );
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                }
            });
            
            // Replace local video stream
            const oldVideoTrack = localStream.getVideoTracks()[0];
            if (oldVideoTrack) {
                localStream.removeTrack(oldVideoTrack);
                oldVideoTrack.stop();
            }
            localStream.addTrack(videoTrack);
            
            // Update local video display
            localVideo.srcObject = localStream;
            
            // Update button UI
            shareScreenBtn.innerHTML = '<i class="fas fa-desktop"></i>';
            shareScreenBtn.classList.remove('active');
            
            isScreenSharing = false;
        }
    } catch (error) {
        console.error('Error toggling screen share:', error);
        alert('Failed to share screen. Please ensure you have given permission and try again.');
    }
}

// Send a chat message
function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('send-message', roomId, message, username);
        chatInput.value = '';
    }
}

// Display a chat message
function displayMessage(message) {
    const isOwnMessage = message.sender === username;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOwnMessage ? 'outgoing' : 'incoming'}`;
    
    const senderElement = document.createElement('div');
    senderElement.className = 'sender';
    senderElement.textContent = isOwnMessage ? 'You' : message.sender;
    
    const contentElement = document.createElement('div');
    contentElement.className = 'content';
    contentElement.textContent = message.content;
    
    const timestampElement = document.createElement('div');
    timestampElement.className = 'timestamp';
    timestampElement.textContent = formatTimestamp(message.timestamp);
    
    messageElement.appendChild(senderElement);
    messageElement.appendChild(contentElement);
    messageElement.appendChild(timestampElement);
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add a system message to the chat
function addSystemMessage(message) {
    const systemMessageElement = document.createElement('div');
    systemMessageElement.className = 'system-message';
    
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    
    systemMessageElement.appendChild(messageElement);
    chatMessages.appendChild(systemMessageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Update UI indicators for local media
function updateLocalMediaUI() {
    // Update audio indicator
    if (!isAudioEnabled) {
        toggleAudioBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        toggleAudioBtn.classList.add('active');
        localAudioIndicator.className = 'fas fa-microphone-slash';
    }
    
    // Update video indicator
    if (!isVideoEnabled) {
        toggleVideoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
        toggleVideoBtn.classList.add('active');
        localVideoIndicator.className = 'fas fa-video-slash';
    }
}

// Update UI indicators for remote user's media
function updateRemoteMediaUI(userId, type, enabled) {
    if (type === 'audio') {
        const audioIndicator = document.getElementById(`audio-${userId}`);
        if (audioIndicator) {
            audioIndicator.className = enabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
        }
    } else if (type === 'video') {
        const videoIndicator = document.getElementById(`video-${userId}`);
        if (videoIndicator) {
            videoIndicator.className = enabled ? 'fas fa-video' : 'fas fa-video-slash';
        }
    }
}

// Copy room ID to clipboard
function copyRoomId() {
    navigator.clipboard.writeText(roomId)
        .then(() => {
            // Show temporary success message
            const originalText = copyRoomIdBtn.innerHTML;
            copyRoomIdBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                copyRoomIdBtn.innerHTML = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy room ID:', err);
            alert('Failed to copy room ID to clipboard');
        });
}

// Leave the current room
function leaveRoom() {
    // Close all peer connections
    Object.values(peers).forEach(peer => {
        peer.connection.close();
    });
    peers = {};
    
    // Stop all tracks
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    
    if (screenShareStream) {
        screenShareStream.getTracks().forEach(track => track.stop());
    }
    
    // Reset variables
    localStream = null;
    screenShareStream = null;
    isScreenSharing = false;
    isAudioEnabled = true;
    isVideoEnabled = true;
    
    // Show welcome screen again
    appScreen.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
    
    // Reset UI elements
    chatMessages.innerHTML = '';
    videoContainer.innerHTML = `
        <div id="local-stream-container" class="video-item">
            <video id="local-video" autoplay muted playsinline></video>
            <div class="video-info">
                <span class="video-name">You</span>
                <div class="video-status">
                    <i class="fas fa-microphone" id="local-audio-indicator"></i>
                    <i class="fas fa-video" id="local-video-indicator"></i>
                </div>
            </div>
        </div>
    `;
    
    // Reset control buttons
    toggleAudioBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    toggleAudioBtn.classList.remove('active');
    toggleVideoBtn.innerHTML = '<i class="fas fa-video"></i>';
    toggleVideoBtn.classList.remove('active');
    shareScreenBtn.innerHTML = '<i class="fas fa-desktop"></i>';
    shareScreenBtn.classList.remove('active');
    
    // Redirect to home page
    window.location.href = '/';
}

// Generate a random user ID
function generateUserId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Format timestamp for chat messages
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Initialize the app when the page loads
window.addEventListener('load', init);
