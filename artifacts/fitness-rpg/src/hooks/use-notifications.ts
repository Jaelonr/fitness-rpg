import { useState, useCallback } from "react";

export type NotificationPermission = "default" | "granted" | "denied";

export function useNotifications() {
  const isSupported = typeof window !== "undefined" && "Notification" in window;

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (!isSupported) return "denied";
    return Notification.permission as NotificationPermission;
  });

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return "denied";
    const result = await Notification.requestPermission();
    setPermission(result as NotificationPermission);
    return result as NotificationPermission;
  }, [isSupported]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || Notification.permission !== "granted") return;
    try {
      new Notification(title, {
        icon: "/icons/icon.svg",
        badge: "/icons/icon.svg",
        ...options,
      });
    } catch {
      // Silent fail — some contexts (cross-origin iframes) block Notification
    }
  }, [isSupported]);

  const scheduleReminder = useCallback((timeStr: string, message: string) => {
    if (!isSupported || Notification.permission !== "granted") return;
    const [hours, minutes] = timeStr.split(":").map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target.getTime() - now.getTime();
    const key = `reminder-${timeStr}`;
    const existing = (window as any).__reminderTimers?.[key];
    if (existing) clearTimeout(existing);
    if (!(window as any).__reminderTimers) (window as any).__reminderTimers = {};
    (window as any).__reminderTimers[key] = setTimeout(() => {
      sendNotification("⚔️ Workout Reminder", { body: message, tag: "workout-reminder" });
    }, delay);
  }, [isSupported, sendNotification]);

  const cancelReminders = useCallback(() => {
    const timers = (window as any).__reminderTimers ?? {};
    Object.values(timers).forEach(id => clearTimeout(id as number));
    (window as any).__reminderTimers = {};
  }, []);

  return { isSupported, permission, requestPermission, sendNotification, scheduleReminder, cancelReminders };
}
