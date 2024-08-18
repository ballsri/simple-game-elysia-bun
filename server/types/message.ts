import type { Player, PlayerInfo, PlayerPosition, WebSocketData } from "./player";

export interface GenericPayload {
  jsonrpc: string;
  id: number;
  method: string;
  params: any;
}

export interface JoinPayload extends GenericPayload {
  params: PlayerInfo
}

export interface MovePlayerPayload extends GenericPayload {
  params: PlayerPosition
}

export interface ChatPayload extends GenericPayload {
  params: string;
}
