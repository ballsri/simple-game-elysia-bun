import { Elysia } from "elysia";
import { Redis } from "ioredis";
import type { GenericPayload, MovePlayerPayload } from "./types/message";
import type { Player } from "./types/player";
import { WebSocketGateway } from "./ws/gateway";
import { WebSocketManager } from "./ws/manager";
import MqAdapter from "./mq/mq";
import mq from "./mq/mq";

export const redis = new Redis(6000, "localhost");
const app = new Elysia();
const players: Record<string, Player> = {};
const webSocketManager = new WebSocketManager();
app.ws("/jsonrpc", {
  open: (socket) => {
    webSocketManager.addConnection(socket.id, socket);
  },
  message: (socket, message) => {
    console.log("Message received", message);
    const data = message as GenericPayload;
    const connection = webSocketManager.getConnection(socket.id);
    if (!connection || !connection.socket) {
      console.error("Connection not found for socket id", socket.id);
      return;
    }
    let gateway = connection.webSocketGateway;
    if (!gateway) {
      gateway = new WebSocketGateway(connection.socket);
      webSocketManager.addGateway(socket.id, gateway);
    }
    // TODO: publish the message to specific mq partition based on user id and sharding mechanism
    switch (data.method) {
      case "movePlayer":
        let movePlayerData = data as MovePlayerPayload;
        gateway.movePlayer(movePlayerData);
        break;
      default:
        socket.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: data.id,
            error: {
              code: -32601,
              message: "Method not found",
            },
          })
        );
    }
  },
  close: (socket) => {
    webSocketManager.removeConnection(socket.id);
  },
});
process.on("SIGTERM", async () => {
  await mq.consumer?.stop();
  await mq.consumer?.disconnect();
  console.log("Kafka consumer disconnected successfully.");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});

