import type { Socket } from "../types/socket";
import { WebSocketGateway } from "./gateway";

class WebSocketManager {
  private connections: Map<string, Socket>;
  private gateway: Map<string, WebSocketGateway>;

  constructor() {
    this.connections = new Map();
    this.gateway = new Map();
  }

  addConnection(id: string, socket: Socket) {
    this.connections.set(id, socket);
    this.gateway.set(id, new WebSocketGateway(socket));
    console.log("Connection added", this.connections.size, this.gateway.size);
  }

  addGateway(id: string, gateway: WebSocketGateway) {
    this.gateway.set(id, gateway);
  }

  getConnection(id: string): {
    socket: Socket | undefined;
    webSocketGateway: WebSocketGateway | undefined;
  } {
    return {
      socket: this.connections.get(id),
      webSocketGateway: this.gateway.get(id),
    };
  }

  removeConnection(id: string) {
    this.connections.delete(id);
    this.gateway.delete(id);
    console.log("Connection removed", this.connections.size, this.gateway.size);
  }
}
const webSocketManager = new WebSocketManager();
export default webSocketManager;
