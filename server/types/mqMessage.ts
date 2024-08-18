import type { PlayerPosition, WebSocketData } from "./player";

export type MovePlayerMessage = {
  userId: string;
  position: PlayerPosition;
} & WebSocketData;

export type JoinMessage = {
    userId: string;
    name: string;
} & WebSocketData;