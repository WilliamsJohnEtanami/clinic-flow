import { prisma } from "@/config/prisma";
import { NotificationType, Prisma } from "@prisma/client";
import { notifyUser } from "@/realtime/socket";
import { SOCKET_EVENTS } from "@/realtime/events";
import { NotFoundError } from "@/utils/errors";

export class NotificationService {
  /**
   * Create a notification for a user
   */
  static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
    transaction?: Prisma.TransactionClient,
  ) {
    const client = transaction ?? prisma;
    const notification = await client.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: (data ?? {}) as Prisma.InputJsonValue,
      },
    });

    if (!transaction) {
      notifyUser(userId, SOCKET_EVENTS.QUEUE_UPDATED, {
        type: "notification_created",
        notification,
      });
    }

    return notification;
  }

  /**
   * Get unread notifications for a user
   */
  static async getUnreadNotifications(userId: string, limit = 20, offset = 0) {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId,
          read: false,
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      }),
    ]);

    return { notifications, total, limit, offset };
  }

  /**
   * Get all notifications for a user
   */
  static async getAllNotifications(userId: string, limit = 50, offset = 0) {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return { notifications, total, limit, offset };
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification || notification.userId !== userId) throw new NotFoundError("Notification");

    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: { read: true },
    });
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification || notification.userId !== userId) throw new NotFoundError("Notification");

    return prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Notify when a patient is called
   */
  static async notifyPatientCalled(
    patientUserId: string,
    token: string,
    room: string,
    transaction?: Prisma.TransactionClient,
  ) {
    return this.createNotification(
      patientUserId,
      "DOCTOR_CALLING",
      "Your turn in queue",
      `Your turn! Please proceed to ${room}`,
      { token, room, type: "PATIENT_CALLED" },
      transaction,
    );
  }

  /**
   * Notify when an appointment is confirmed
   */
  static async notifyAppointmentConfirmed(
    patientUserId: string,
    appointmentId: string,
    date: string,
    transaction?: Prisma.TransactionClient,
  ) {
    return this.createNotification(
      patientUserId,
      "APPOINTMENT_REMINDER",
      "Appointment confirmed",
      `Your appointment is confirmed for ${date}`,
      { appointmentId, date },
      transaction,
    );
  }

  /**
   * Notify when an appointment is cancelled
   */
  static async notifyAppointmentCancelled(patientUserId: string, reason?: string) {
    return this.createNotification(
      patientUserId,
      "QUEUE_UPDATED",
      "Appointment cancelled",
      reason ? `Your appointment was cancelled: ${reason}` : "Your appointment was cancelled",
      { reason },
    );
  }

  /**
   * Notify when a patient is marked as no-show
   */
  static async notifyNoShow(patientUserId: string) {
    return this.createNotification(
      patientUserId,
      "QUEUE_UPDATED",
      "Marked as no-show",
      "You were marked as no-show for your queue entry",
      { type: "NO_SHOW" },
    );
  }
}
