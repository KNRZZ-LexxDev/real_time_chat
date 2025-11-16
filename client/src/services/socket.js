import { io } from 'socket.io-client';

/**
 * Socket.IO client instance
 * Manages real-time connection to server
 */
class SocketService {
  constructor() {
    this.socket = null;
  }

  /**
   * Connect to socket server with authentication
   */
  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  /**
   * Disconnect from socket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Get socket instance
   */
  getSocket() {
    return this.socket;
  }
}

export default new SocketService();
