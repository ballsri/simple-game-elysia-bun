import mq from "../mq/mq";
import type { MovePlayerPayload } from "../types/message";
import type { Socket } from "../types/socket";

class WebSocketGateway {
  id: string;
  socket: Socket;

  constructor(socket: Socket) {
    this.id = socket.id;
    this.socket = socket;
  }

  // Validate and publish the message to the message queue
  async movePlayer(data: MovePlayerPayload) {
    // Validate the data
    // Publish the message to the message queue
    // TODO: get partition from user id and sharding mechanism
    let partition = 0;
    await mq.sendMessage("movePlayer", partition, data.params);
  }
}

export { WebSocketGateway };
