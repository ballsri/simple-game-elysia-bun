import { events } from "../env";
import mq from "../mq/mq";
import type {
  GenericPayload,
  JoinPayload,
  MovePlayerPayload,
} from "../types/message";
import type { JoinMessage, MovePlayerMessage } from "../types/mqMessage";
import type { Socket } from "../types/socket";

class WebSocketGateway {
  id: string;
  socket: Socket;

  constructor(socket: Socket) {
    this.id = socket.id;
    this.socket = socket;
  }

  async join(data: JoinPayload) {
    // Validate the data
    // Transform the data
    const joinMessage: JoinMessage = {
      requestId: data.id,
      userId: data.params.userId,
      name: data.params.name,
      webSocketId: this.id,
    };
    // Publish the message to the message queue
    let partition = 0;
    await mq.sendMessage(data.id, events.JOIN, partition, joinMessage);
  }

  // Validate and publish the message to the message queue
  async movePlayer(data: MovePlayerPayload) {
    // Validate the data
    // Publish the message to the message queue
    // TODO: get partition from user id and sharding mechanism
    let partition = 0;
    const movePlayerMessage: MovePlayerMessage = {
      requestId: data.id,
      userId: data.params.userId,
      webSocketId: this.id,
      position: {
        userId: data.params.userId,
        mapId: data.params.mapId,
        x: data.params.x,
        y: data.params.y,
      },
    };

    await mq.sendMessage(
      data.id,
      events.MOVE_PLAYER,
      partition,
      movePlayerMessage
    );
  }
}

export { WebSocketGateway };
