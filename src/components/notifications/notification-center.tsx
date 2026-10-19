import { useState } from "react";
import { Bell, Check, CheckCheck, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth/context";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
  useUnreadNotifications,
} from "@/lib/notifications/api-hooks";
import { formatDistanceToNowStrict } from "@/lib/utils/date";

export function NotificationCenter() {
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  const notificationsQuery = useNotificationsList(30);
  const unreadQuery = useUnreadNotifications(1);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const removeNotification = useDeleteNotification();

  if (status !== "authenticated") return null;

  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = unreadQuery.data?.total ?? 0;
  const busy = markRead.isPending || markAllRead.isPending || removeNotification.isPending;

  return (
    <div className="fixed bottom-5 right-5 z-40">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="relative size-11 rounded-full bg-card shadow-clinic-lg"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={10}
          className="w-[min(24rem,calc(100vw-2rem))] p-0"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Notifications</h2>
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={unreadCount === 0 || busy}
              onClick={() => markAllRead.mutate()}
            >
              {markAllRead.isPending ? (
                <Loader2 className="mr-1 size-3.5 animate-spin" />
              ) : (
                <CheckCheck className="mr-1 size-3.5" />
              )}
              Mark all read
            </Button>
          </div>

          {notificationsQuery.error || unreadQuery.error ? (
            <p role="alert" className="p-4 text-sm text-destructive">
              Could not load notifications.{" "}
              {(notificationsQuery.error ?? unreadQuery.error)?.message}
            </p>
          ) : notificationsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading notifications…
            </div>
          ) : notifications.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">You’re all caught up.</p>
          ) : (
            <ul className="max-h-[min(60vh,28rem)] divide-y overflow-y-auto">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`flex gap-3 px-4 py-3 ${
                    notification.read ? "bg-card" : "bg-primary/5"
                  }`}
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      notification.read ? "bg-muted" : "bg-primary"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatDistanceToNowStrict(notification.createdAt)} ago
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-1">
                    {!notification.read && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={`Mark ${notification.title} as read`}
                        disabled={busy}
                        onClick={() => markRead.mutate(notification.id)}
                      >
                        <Check className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${notification.title}`}
                      disabled={busy}
                      onClick={() => removeNotification.mutate(notification.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
