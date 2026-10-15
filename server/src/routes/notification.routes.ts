import { AuthenticatedRequest, requireAuth } from "@/middleware/auth.middleware";
import { asyncHandler } from "@/utils/async-handler";
import { NotificationService } from "@/services/notification.service";
import { UnauthorizedError, ValidationError } from "@/utils/errors";
import { Router, Response } from "express";

const router = Router();

router.use(requireAuth);

function userId(req: AuthenticatedRequest): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

function paginationValue(value: unknown, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  const minimum = name === "limit" ? 1 : 0;
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > 100) {
    throw new ValidationError(`${name} must be an integer between ${minimum} and 100.`);
  }
  return parsed;
}

router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = paginationValue(req.query.limit, 20, "limit");
    const offset = paginationValue(req.query.offset, 0, "offset");
    const { notifications, total } = await NotificationService.getAllNotifications(
      userId(req),
      limit,
      offset,
    );
    res.json({ notifications, total, limit, offset });
  }),
);

router.get(
  "/unread",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = paginationValue(req.query.limit, 20, "limit");
    const offset = paginationValue(req.query.offset, 0, "offset");
    res.json(await NotificationService.getUnreadNotifications(userId(req), limit, offset));
  }),
);

router.get(
  "/unread-count",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { total } = await NotificationService.getUnreadNotifications(userId(req), 1, 0);
    res.json({ count: total });
  }),
);

router.patch(
  "/read-all",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await NotificationService.markAllAsRead(userId(req));
    res.json({ message: "All notifications marked as read" });
  }),
);

router.patch(
  "/:id/read",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const notification = await NotificationService.markAsRead(req.params.id, userId(req));
    res.json({ notification });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await NotificationService.deleteNotification(req.params.id, userId(req));
    res.json({ message: "Notification deleted successfully" });
  }),
);

export const notificationRouter = router;
