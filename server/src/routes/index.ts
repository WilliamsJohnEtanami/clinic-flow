import { Router } from "express";
import { authRouter } from "./auth.routes";
import { queueRouter } from "./queue.routes";
import { patientRouter } from "./patient.routes";
import { appointmentRouter } from "./appointment.routes";
import { notificationRouter } from "./notification.routes";
import { adminRouter } from "./admin.routes";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/queue", queueRouter);
apiRouter.use("/patients", patientRouter);
apiRouter.use("/appointments", appointmentRouter);
apiRouter.use("/notifications", notificationRouter);
apiRouter.use("/admin", adminRouter);
