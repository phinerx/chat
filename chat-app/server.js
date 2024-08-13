const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Object to keep track of connected users
let users = {};

// Handle new socket connections
io.on('connection', (socket) => {
    console.log('A user connected');

    // Add new user to the user list
    socket.on('join', (username) => {
        users[socket.id] = username;
        io.emit('user list', Object.values(users));
    });

    // Handle incoming chat messages
    socket.on('chat message', (data) => {
        io.emit('chat message', data);
    });

    // Handle incoming call requests
    socket.on('call', (data) => {
        socket.to(Object.keys(users).find(id => users[id] === data.to)).emit('call', {
            username: users[socket.id],
            from: socket.id,
            offer: data.offer
        });
    });

    // Handle call answers
    socket.on('answer', (data) => {
        socket.to(data.to).emit('answer', { from: socket.id });
    });

    // Handle ICE candidates
    socket.on('ice-candidate', (data) => {
        socket.to(data.to).emit('ice-candidate', { candidate: data.candidate });
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log('A user disconnected');
        delete users[socket.id];
        io.emit('user list', Object.values(users));
    });
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
