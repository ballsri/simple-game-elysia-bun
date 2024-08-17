export interface Player {
  userId: string;
  webSocketId: string;
  name: string;
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
