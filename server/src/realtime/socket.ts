import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "@/config/env";
import { verifyAccessToken } from "@/utils/jwt";
import { SOCKET_EVENTS, type SocketEventName } from "./events";

let io: SocketIOServer | undefined;

/** Room naming: everyone joins "queue" (public); doctors/reception also join role rooms. */
export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    // Auth is optional for the public display; if a token is present, validate it
    // and attach the user's role so we can target role-specific rooms.
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next();
    try {
      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(); // fall back to unauthenticated/public access
    }
  });

  io.on("connection", (socket) => {
    socket.join("queue"); // public room — display screen, all dashboards

    const role = socket.data.user?.role as string | undefined;
    if (role) socket.join(`role:${role.toLowerCase()}`);

    const userId = socket.data.user?.sub as string | undefined;
    if (userId) socket.join(`user:${userId}`);
  });

  return io;
}

export function getSocketServer(): SocketIOServer {
  if (!io) throw new Error("Socket.IO server not initialized. Call initSocketServer() first.");
  return io;
}

/** Broadcast a queue-domain event to every connected client (dashboards + display). */
export function broadcastQueueEvent(event: SocketEventName, payload: unknown): void {
  if (!io) return;
  io.to("queue").emit(event, payload);
  io.to("queue").emit(SOCKET_EVENTS.QUEUE_UPDATED, payload);
}

/** Send a targeted notification to a single user (e.g. "You're next"). */
export function notifyUser(userId: string, event: SocketEventName, payload: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}
