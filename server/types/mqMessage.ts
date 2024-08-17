import type { PlayerPosition } from "./player";

export type MovePlayerMessage = {
    userId: string;
    position: PlayerPosition;
}