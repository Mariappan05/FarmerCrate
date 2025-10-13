const WebSocket = require('ws');

class WebSocketService {
  constructor() {
    this.clients = new Map();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws, req) => {
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'subscribe' && data.order_id) {
            this.clients.set(data.order_id, ws);
            ws.send(JSON.stringify({
              type: 'subscribed',
              order_id: data.order_id,
              message: 'Successfully subscribed to order updates'
            }));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        for (const [orderId, client] of this.clients.entries()) {
          if (client === ws) {
            this.clients.delete(orderId);
            break;
          }
        }
      });
    });
  }

  sendOrderUpdate(orderId, updateData) {
    const client = this.clients.get(orderId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'order_update',
        order_id: orderId,
        data: updateData,
        timestamp: new Date().toISOString()
      }));
    }
  }

  broadcastToAll(data) {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}

module.exports = new WebSocketService();