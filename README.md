# Simple Game with Elysia and Bun

## Features

 1. 2d graphic game
 2. login/ logout
 3. player is a circle with skin customization
 4. player can custom their profile such as display name, selected skills(TODO) skin(TODO)
 5. lvl, exp, perk and skill point system such as increase initial hp, hit dmg, skills(TODO)
 6. pvp system such as hitting, special skill, perks
 7. map design with resources to farm exp

## Code Framework

 1. In-memory db: Redis v9
 2. Persistent db: Postgresql
 3. Client web: Vitejs v5
 4. Backend: Bun + Elysiajs (micro service is TODO)
 5. event bus: Kafka (not currently needed so TODO)

## Code Structure Design

 1. online players connect to server via websocket with JsonRPC
 2. states stores in Redis first and will be store in persistent db
 3. player's action will be in event-driven for large pvp scale (but it may not be that large TT) 
