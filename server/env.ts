
export const events = {
    JOIN:'join',
    MOVE_PLAYER:'movePlayer'
}
export const env = {
    MQ_CLIENT_ID: 'app',
    MQ_BROKER_URLS: 'localhost:9092',
    REDIS_PORT: 6000,
    REDIS_HOST: 'localhost',
    SERVER_PORT: 3000,
    CENTER_LATITUDE: 37.7749,
    CENTER_LONGITUDE: -122.4194,
    NOTIFY_PLAYER_RADIUS: 100,
    PLAYER_POSITION_SECTOR_SIZE: 100,
    MAP_SIZE_X: 2000,
    MAP_SIZE_Y: 2000,
    DEGREES_PER_METER: 1 / 111000,

}