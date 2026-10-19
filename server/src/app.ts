import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "@/config/env";
import { apiRouter } from "@/routes";
import { notFoundHandler, errorHandler } from "@/middleware/error.middleware";
import { apiRateLimiter } from "@/middleware/rate-limit.middleware";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use((req, res, next) => {
    const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || req.get("host");
    const requestProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim() || req.protocol;
    const requestOrigin = req.get("origin");
    let isSameOrigin = false;

    if (requestOrigin && requestHost) {
      try {
        isSameOrigin = new URL(requestOrigin).origin === `${requestProtocol}://${requestHost}`;
      } catch {
        isSameOrigin = false;
      }
    }

    cors({
      origin: (
        origin: string | undefined,
        callback: (error: Error | null, allowed?: boolean) => void,
      ) => {
        if (!origin || isSameOrigin || env.corsOrigin.includes(origin)) callback(null, true);
        else callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    })(req, res, next);
  });
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan(env.isProduction ? "combined" : "dev"));
  app.use(apiRateLimiter);

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
