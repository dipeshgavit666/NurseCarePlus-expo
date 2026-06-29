import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Medication } from "../api";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Schedule daily local alarms for all medication times.
 * Returns a map of { medicationId_time -> notificationId }
 */
export async function scheduleMedicationAlarms(
  medications: Medication[]
): Promise<Record<string, string>> {
  const granted = await requestNotificationPermission();
  if (!granted) return {};

  // Cancel all previous med notifications first
  await cancelAllMedicationAlarms();

  const scheduled: Record<string, string> = {};

  for (const med of medications) {
    for (const timeStr of med.times ?? []) {
      const [hourStr, minStr] = timeStr.split(":");
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minStr ?? "0", 10);
      if (isNaN(hour) || isNaN(minute)) continue;

      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "💊 Medication Reminder",
            body: `Time to take ${med.name} ${med.dosage}`,
            data: { medicationId: med._id, medName: med.name, time: timeStr },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });
        scheduled[`${med._id}_${timeStr}`] = id;
      } catch (err) {
        console.warn("Failed to schedule alarm for", med.name, timeStr, err);
      }
    }
  }

  return scheduled;
}

export async function cancelAllMedicationAlarms(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Fire a one-time "missed dose" notification (called 30min after due time if not marked taken).
 */
export async function sendMissedDoseAlert(medName: string, familyNames: string[] = []): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⚠️ Missed Medication",
      body: `${medName} was not taken. ${familyNames.length ? `Notifying: ${familyNames.join(", ")}` : ""}`,
      data: { type: "missed_dose" },
      sound: true,
    },
    trigger: null, // immediate
  });
}

export async function getScheduledAlarms() {
  return Notifications.getAllScheduledNotificationsAsync();
}
