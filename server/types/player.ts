export interface WebSocketData {
    webSocketId: string;
}

export interface PlayerInfo extends WebSocketData {
    userId: string;
    name: string;
}

export interface Player extends PlayerInfo {
    position: PlayerPosition;
    hp: number;
    maxHp: number;
    attackPower: number;
}

export interface PlayerPosition {
  userId: string;
  mapId: string;
  x: number;
  y: number;
}
