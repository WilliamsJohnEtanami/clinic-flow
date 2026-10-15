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

  const corsOptions = {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allowed?: boolean) => void,
    ) => {
      if (!origin || env.corsOrigin.includes(origin)) callback(null, true);
      else callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  };

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan(env.isProduction ? "combined" : "dev"));
  app.use(apiRateLimiter);

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
