import { Elysia } from "elysia";
import { Redis } from "ioredis";
import type { GenericPayload, JoinPayload, MovePlayerPayload } from "./types/message";
import type { Player } from "./types/player";
import { WebSocketGateway } from "./ws/gateway";
import webSocketManager from "./ws/manager";

import mq from "./mq/mq";
import { env } from "./env";

export const players: Record<string, Player> = {};
export const redis = new Redis(env.REDIS_PORT, env.REDIS_HOST);
const app = new Elysia();
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
      case "join":
        let joinData = data as JoinPayload;
        gateway.join(joinData);
        break;
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
  for (const consumer of Object.values(mq.consumers)) {
    await consumer.stop();
    await consumer.disconnect();
  }
  console.log("Kafka consumer disconnected successfully.");
});

app.listen(env.SERVER_PORT, () => {
  console.log("Server is running on http://localhost:" + env.SERVER_PORT);
});

