import { players, redis } from "..";
import { env } from "../env";
import type { MovePlayerPayload } from "../types/message";
import type { JoinMessage, MovePlayerMessage } from "../types/mqMessage";
import type { Player, PlayerPosition } from "../types/player";
import webSocketManager from "../ws/manager";

class PlayerService {
  constructor() {
    console.log("PlayerService created");

    // Bind the methods to the current instance
    this.join = this.join.bind(this);
    this.movePlayer = this.movePlayer.bind(this);
  }

  async join(message: JoinMessage) {
    const connection = webSocketManager.getConnection(message.webSocketId);

    if (!connection || !connection.socket) {
      console.error("Connection not found for socket id", message.webSocketId);
      return;
    }
    console.log("join message received:", message);
    if (!message || !message.userId || !message.name) {
      console.error("Invalid join message");
      return connection.socket.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: message.requestId,
          error: {
            code: -32602,
            message: "Invalid join message",
          },
        })
      );
    }
    if (players[message.userId]) {
      console.error("Player already joined");
      return connection.socket.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: message.requestId,
          result: players[message.userId],
        })
      );
    }
    // initialize player
    // TODO: need to query from sql db if user exists
    const player: Player = {
      userId: message.userId,
      name: message.name,
      webSocketId: message.webSocketId,
      position: {
        userId: message.userId,
        mapId: "1",
        x: 0,
        y: 0,
      },
      hp: 100,
      maxHp: 100,
      attackPower: 10,
    };

    // add player to players
    players[message.userId] = player;

    // update player position
    await this.updatePlayerPosition(
      message.userId,
      player.position.mapId,
      player.position.x,
      player.position.y
    );

    // reply to the player

    connection.socket.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: message.requestId,
        result: {
          userId: player.userId,
          name: player.name,
          position: player.position,
          hp: player.hp,
          maxHp: player.maxHp,
          attackPower: player.attackPower,
        },
      })
    );

    // send player position to all clients nearby

    await this.notifyNearbyPlayersPositionUpdate(player);
  }

  async movePlayer(message: MovePlayerMessage) {
    console.log("movePlayer message received:", message);
    const player = players[message.userId];
    if (!player) {
      console.error("Player not found");
      return;
    }
    // update player position
    console.log("Updating player position");
    const response = await this.updatePlayerPosition(
      message.userId,
      message.position.mapId,
      message.position.x,
      message.position.y
    );

    if (!response) {
      console.error("Failed to update player position");
      return;
    }

    // update player position in players
    player.position = response;
    // reply to the player
    const connection = webSocketManager.getConnection(message.webSocketId);
    if (!connection || !connection.socket) {
      console.error("Connection not found for socket id", message.userId);
      return;
    }
    connection.socket.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: message.requestId,
        result: response,
      })
    );
    // get nearby players and notify them
    await this.notifyNearbyPlayersPositionUpdate(player);
  }

  // Calculate the sector ID based on player coordinates
  calculateSectorId(x: number, y: number): string {
    const sectorSize = env.PLAYER_POSITION_SECTOR_SIZE; // Define the size of each sector
    const sectorX = Math.floor(x / sectorSize);
    const sectorY = Math.floor(y / sectorSize);
    return `${sectorX},${sectorY}`;
  }

  geoCoordsToGameCoords(
    longitude: string,
    latitude: string,
    mapSizeX: number,
    mapSizeY: number
  ) {
    // Assume the map's center (1000, 1000) corresponds to a chosen central geo-coordinate
    const centralLongitude = env.CENTER_LONGITUDE; // Example: Center of San Francisco
    const centralLatitude = env.CENTER_LATITUDE;

    // Convert the geo-coordinates relative to the center
    const degreesPerMeter = env.DEGREES_PER_METER; // Approximation at the equator
    const dx = (Number(longitude) - centralLongitude) / degreesPerMeter;
    const dy = (Number(latitude) - centralLatitude) / degreesPerMeter;

    const x = mapSizeX / 2 + dx;
    const y = mapSizeY / 2 + dy;

    return { x, y };
  }

  gameCoordsToGeoCoords(
    x: number,
    y: number,
    mapSizeX: number,
    mapSizeY: number
  ) {
    // Assume the map's center (1000, 1000) corresponds to a chosen central geo-coordinate
    const centralLongitude = env.CENTER_LONGITUDE; // Example: Center of San Francisco
    const centralLatitude = env.CENTER_LATITUDE;

    // Convert the game coordinates relative to the center
    const degreesPerMeter = env.DEGREES_PER_METER; // Approximation at the equator
    const dx = x - mapSizeX / 2; // Displacement from the center in meters
    const dy = y - mapSizeY / 2; // Displacement from the center in meters

    const longitude = centralLongitude + dx * degreesPerMeter;
    const latitude = centralLatitude + dy * degreesPerMeter;

    return { longitude, latitude };
  }

  // Update player position in the correct sector
  async updatePlayerPosition(
    userId: string,
    mapId: string,
    x: number,
    y: number
  ): Promise<PlayerPosition | null> {
    // update player position in Redis
    const { mapSizeX, mapSizeY } = {
      mapSizeX: env.MAP_SIZE_X,
      mapSizeY: env.MAP_SIZE_Y,
    };
    const { longitude, latitude } = this.gameCoordsToGeoCoords(
      x,
      y,
      mapSizeX,
      mapSizeY
    );
    const player = players[userId];
    const sectorId = this.calculateSectorId(x, y);
    const oldSectorId = this.calculateSectorId(
      player.position.x,
      player.position.y
    );
    const key = `map:${mapId}:sector:${sectorId}`;
    const oldKey = `map:${player.position.mapId}:sector:${oldSectorId}`;
    if (oldKey !== key) {
      await redis.zrem(oldKey, userId);
    }
    let response = await redis.geoadd(key, longitude, latitude, userId);
    console.log("Player position updated:", response);

    const movePlayerMessage: PlayerPosition = {
      userId: userId,
      mapId,
      x,
      y,
    };
    return movePlayerMessage;
  }

  // Get nearby players from Redis based on sectors
  async getNearbyPlayers(
    userId: string,
    mapId: string,
    x: number,
    y: number,
    radius: number
  ) {
    const { mapSizeX, mapSizeY } = {
      mapSizeX: env.MAP_SIZE_X,
      mapSizeY: env.MAP_SIZE_Y,
    };
    const sectorId = this.calculateSectorId(x, y);
    const key = `map:${mapId}:sector:${sectorId}`;
    const { longitude, latitude } = this.gameCoordsToGeoCoords(
      x,
      y,
      mapSizeX,
      mapSizeY
    );
    const playersInSector = await redis.georadius(
      key,
      longitude,
      latitude,
      radius,
      "m",
      "WITHCOORD",
      "WITHDIST"
    );
    // get players in nearby sectors
    const nearbySectors = this.getNearbySectors(sectorId, x, y, radius);
    const nearbyPlayers = await this.getPlayersInNearbySectors(
      mapId,
      nearbySectors
    );
    return Array.from(
      new Set(
        playersInSector
          .map((player: unknown) => {
            const [userId, _, coordinates] = player as [
              string,
              string,
              [string, string]
            ];
            return userId;
          })
          .concat(nearbyPlayers)
          .filter((playerId) => playerId !== userId)
      )
    );
  }

  getNearbySectors(sectorId: string, x: number, y: number, radius: number) {
    // use player x, y to get nearby sectors
    // radius in game unit (meters)
    const sectorSize = env.PLAYER_POSITION_SECTOR_SIZE;
    const sectors = [];
    const minX = Math.floor((x - radius) / sectorSize);
    const maxX = Math.floor((x + radius) / sectorSize);
    const minY = Math.floor((y - radius) / sectorSize);
    const maxY = Math.floor((y + radius) / sectorSize);
    // using calculateSectorId to get sectorId
    for (let i = minX; i <= maxX; i++) {
      for (let j = minY; j <= maxY; j++) {
        sectors.push(`${i},${j}`);
      }
    }
    // remove duplicates and remove the current sector
    return Array.from(new Set(sectors)).filter((sector) => sector !== sectorId);
  }

  async getPlayersInNearbySectors(mapId: string, sectors: string[]) {
    const players = [];
    for (const sector of sectors) {
      const key = `map:${mapId}:sector:${sector}`;
      const playerIds = await redis.zrange(key, 0, -1);
      players.push(...playerIds);
    }
    return players;
  }

  async notifyNearbyPlayersPositionUpdate(player: Player) {
    // notify nearby players
    const radius = env.NOTIFY_PLAYER_RADIUS;
    const nearbyPlayerToUpdated = await this.getNearbyPlayers(
      player.userId,
      player.position.mapId,
      player.position.x,
      player.position.y,
      radius
    );
    console.log("Nearby players to update:", nearbyPlayerToUpdated);
    for (const playerId of nearbyPlayerToUpdated) {
      const nearbyPlayer = players[playerId];
      if (!nearbyPlayer) {
        console.error("Nearby player not found");
        continue;
      }
      const nearbyPlayerConnection = webSocketManager.getConnection(
        nearbyPlayer.webSocketId
      );
      if (!nearbyPlayerConnection || !nearbyPlayerConnection.socket) {
        console.error(
          "Connection not found for nearby player",
          nearbyPlayer.userId
        );
        continue;
      }
      nearbyPlayerConnection.socket.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "notifyPlayerPositionUpdate",
          method: "playerPositionUpdate",
          params: {
            userId: player.userId,
            position: player.position,
          },
        })
      );
    }
  }

  getFunction(method: string): (message: any) => void {
    switch (method) {
      case "join":
        return this.join;
      case "movePlayer":
        return this.movePlayer;
      default:
        console.error("Method not found");
        return (message) => {};
    }
  }
}

const playerService = new PlayerService();
export default playerService;
