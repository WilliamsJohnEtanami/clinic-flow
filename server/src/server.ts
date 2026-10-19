import http from "http";
import { createApp } from "./app";
import { env } from "@/config/env";
import { initSocketServer } from "@/realtime/socket";
import { prisma } from "@/config/prisma";

async function main() {
  const app = createApp();
  const httpServer = http.createServer(app);

  initSocketServer(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`VitaFlow API listening on port ${env.port} [${env.nodeEnv}]`);
  });

  const shutdown = async () => {
    console.log("Shutting down gracefully...");
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal error during startup:", err);
  process.exit(1);
});
