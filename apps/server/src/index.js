import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "node:http";
import { WorldRoom } from "./rooms/WorldRoom.js";

const port = Number(process.env.PORT ?? 2567);
const httpServer = createServer();
const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });

gameServer.define("world", WorldRoom);
gameServer.onShutdown(() => console.log("Balostre world server stopped."));
httpServer.listen(port, () => {
  console.log(`Balostre authoritative server listening on port ${port}`);
  console.log(`Room: ws://localhost:${port} (room name: world)`);
});
