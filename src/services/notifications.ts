import * as Notifications from "expo-notifications";
import { Medication } from "../api";

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

export async function scheduleMedicationAlarms(
  medications: Medication[]
): Promise<Record<string, string>> {
  const granted = await requestNotificationPermission();
  if (!granted) return {};

  await cancelAllMedicationAlarms();
  const scheduled: Record<string, string> = {};

  for (const med of medications) {
    for (const slot of med.schedule ?? []) {
      const [hourStr, minStr] = slot.time.split(":");
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minStr ?? "0", 10);
      if (isNaN(hour) || isNaN(minute)) continue;

      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "💊 Medication Reminder",
            body: `Time to take ${med.name} ${med.dose}${med.unit}`,
            data: { medicationId: med._id, medName: med.name, time: slot.time },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });
        scheduled[`${med._id}_${slot.time}`] = id;
      } catch (err) {
        console.warn("Failed to schedule alarm for", med.name, slot.time, err);
      }
    }
  }
  return scheduled;
}

export async function cancelAllMedicationAlarms(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function sendMissedDoseAlert(medName: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⚠️ Missed Medication",
      body: `${medName} was not taken.`,
      data: { type: "missed_dose" },
      sound: true,
    },
    trigger: null,
  });
}

export async function getScheduledAlarms() {
  return Notifications.getAllScheduledNotificationsAsync();
}
