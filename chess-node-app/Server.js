const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the "public" folder
app.use(express.static('public'));

// Initialize the game
let game = new Chess();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send current board state to the new user immediately
    socket.emit('boardState', game.fen());

    // Handle move requests
    socket.on('move', (moveData) => {
        try {
            // Attempt the move on the server
            // FIDE rules (En passant, castling, check) are validated here
            const result = game.move(moveData); 

            if (result) {
                // If valid, broadcast the new board state (FEN) to EVERYONE
                io.emit('boardState', game.fen());
                
                // Check for game over conditions
                if (game.isGameOver()) {
                    let reason = '';
                    if (game.isCheckmate()) reason = 'Checkmate';
                    else if (game.isDraw()) reason = 'Draw';
                    
                    io.emit('gameOver', reason);
                }
            } else {
                // If invalid, tell ONLY the sender to update (revert their piece)
                socket.emit('boardState', game.fen()); 
            }
        } catch (e) {
            console.error("Invalid move attempt");
            socket.emit('boardState', game.fen());
        }
    });

    // Handle reset
    socket.on('reset', () => {
        game.reset();
        io.emit('boardState', game.fen());
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
