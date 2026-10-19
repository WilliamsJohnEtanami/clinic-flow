import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/api-hooks";

/**
 * Get all notifications for current user
 */
export function useNotificationsList(limit = 50, offset = 0) {
  const token = getAccessToken();

  return useQuery({
    queryKey: ["notifications", limit, offset],
    queryFn: async () => {
      if (!token) throw new Error("No access token");
      return api.notifications.list(token, { limit, offset });
    },
    enabled: !!token,
    staleTime: 5000,
    refetchInterval: 30000,
  });
}

/**
 * Get unread notifications for current user
 */
export function useUnreadNotifications(limit = 20, offset = 0) {
  const token = getAccessToken();

  return useQuery({
    queryKey: ["notifications", "unread", limit, offset],
    queryFn: async () => {
      if (!token) throw new Error("No access token");
      return api.notifications.unread(token, { limit, offset });
    },
    enabled: !!token,
    staleTime: 5000,
    refetchInterval: 30000,
  });
}

/**
 * Mark a notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!token) throw new Error("No access token");
      return api.notifications.markAsRead(token, notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("No access token");
      return api.notifications.markAllAsRead(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * Delete a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!token) throw new Error("No access token");
      return api.notifications.delete(token, notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
