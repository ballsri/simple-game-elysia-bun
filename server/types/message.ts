import type { PlayerPosition } from "./player";

export interface GenericPayload {
  jsonrpc: string;
  id: number;
  method: string;
  params: any;
}

export interface MovePlayerPayload extends GenericPayload {
  params: PlayerPosition;
}

export interface ChatPayload extends GenericPayload {
  params: string;
}
