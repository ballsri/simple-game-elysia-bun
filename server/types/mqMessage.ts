import type { PlayerPosition, WebSocketData } from "./player";

export type BaseMessage = {
  requestId: string;
  userId: string;
} & WebSocketData;

export type MovePlayerMessage = BaseMessage & {
  position: PlayerPosition;
};

export type JoinMessage = BaseMessage & {
  name: string;
};
