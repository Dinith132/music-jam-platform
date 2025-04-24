# WebRTC Video Conference Application

A real-time video conferencing application built with WebRTC, Socket.IO, and Express.js. This application allows users to create or join video chat rooms, share their screens, and communicate via text chat. It's a fully responsive and scalable solution designed to provide an excellent video conferencing experience.

## Features

- **Multi-user video conferencing**: Connect with multiple participants in a video chat room.
- **Real-time text chat**: Communicate with others via text during the call.
- **Screen sharing**: Share your screen with others in the room.
- **Microphone mute/unmute**: Toggle your microphone on/off.
- **Camera on/off toggle**: Control your video feed with ease.
- **Connection status indicators**: Get real-time feedback on the status of your connection and peers.
- **Responsive design**: Seamless experience across desktop and mobile devices.
- **Room-based communication**: Create or join specific rooms for better organized and isolated conversations.
  
## Live Demo

You can try out the application here:  
[WebRTC Video Conference Application](https://real-time-video-conferencing-application.onrender.com)

## Prerequisites

Ensure that you have the following installed on your machine:

- **Node.js** (v14.0.0 or higher)
- **NPM** (v6.0.0 or higher)

## Installation

### 1. Clone the repository:

```bash
git clone <your-repo-url>
cd webrtc-video-conference
```

### 2. Install dependencies:

```bash
npm install
```

### 3. Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### 4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Join a Room**:
   - Enter a room ID in the input field.
   - Click the "Join Room" button to enter the video conference room.
   
2. **Grant Permissions**:
   - Allow camera and microphone access when prompted by your browser.
   
3. **Control Your Video**:
   - Use the control buttons to:
     - Toggle your microphone on/off.
     - Toggle your camera on/off.
     - Share your screen.
     - Send and receive chat messages.

4. **Leave the Room**:
   - Use the "Leave" button to exit the conference room.

## Technologies Used

- **WebRTC**: For peer-to-peer video communication.
- **Socket.IO**: For real-time, bidirectional communication between the server and clients.
- **Express.js**: A minimal web framework for building the backend.
- **HTML5**: For creating the structure of the app.
- **CSS3**: For styling the app and ensuring a responsive design.
- **JavaScript (ES6+)**: For app logic and real-time updates.

### Note:
Make sure your browser supports WebRTC for optimal performance.

## Deployment

This application is hosted on Render. You can access the live demo at:

[https://real-time-video-conferencing-application.onrender.com](https://real-time-video-conferencing-application.onrender.com)

## How It Works

1. **WebRTC for Peer-to-Peer Video**: WebRTC (Web Real-Time Communication) allows direct peer-to-peer communication for video and audio without the need for an intermediary server.
   
2. **Socket.IO for Real-Time Communication**: Socket.IO handles signaling between clients, ensuring they can join rooms, exchange messages, and update their states (like toggling video/audio) in real time.

3. **Express.js Backend**: The server is responsible for serving static files and managing WebSocket connections. Express.js enables routing and backend support.

## Troubleshooting

- **No video/audio?** Ensure that you've granted the necessary permissions to use the microphone and camera in your browser.
- **Room issues?** Make sure you're using a unique room ID. If a room already exists with that ID, you will be placed in it.

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
