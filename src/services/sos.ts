import * as Location from "expo-location";
import * as SMS from "expo-sms";
import { Linking, Platform } from "react-native";
import { sosApi } from "../api";

export interface SosLocation {
  lat: number;
  lng: number;
}

/**
 * Request location permission and get current coordinates.
 * Returns null if permission denied or location unavailable.
 */
export async function getCurrentLocation(): Promise<SosLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  } catch {
    return null;
  }
}

export function buildMapsLink(loc: SosLocation): string {
  return `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
}

/**
 * Send an SMS with live location to one or more phone numbers.
 * Returns true if the SMS composer was opened successfully.
 */
export async function sendEmergencySMS(
  numbers: string[],
  patientName: string,
  location: SosLocation | null
): Promise<boolean> {
  const isAvailable = await SMS.isAvailableAsync();
  if (!isAvailable || numbers.length === 0) return false;

  const locText = location
    ? `Location: ${buildMapsLink(location)}`
    : "Location unavailable.";

  const message = `🆘 EMERGENCY ALERT\n${patientName} needs urgent help.\n${locText}\n\nSent via NurseCare+`;

  const { result } = await SMS.sendSMSAsync(numbers, message);
  return result === "sent" || result === "unknown";
}

/**
 * Initiate a phone call to the given number (opens native dialer).
 */
export async function callEmergencyNumber(number: string): Promise<void> {
  const url = Platform.OS === "android" ? `tel:${number}` : `telprompt:${number}`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) await Linking.openURL(url);
  else await Linking.openURL(`tel:${number}`);
}

/**
 * Full SOS pipeline:
 * 1. Get current location
 * 2. Log SOS event to backend
 * 3. Send SMS to emergency contacts (if numbers provided)
 * Returns the location used (for display) and whether SMS succeeded.
 */
export async function triggerFullSOS(params: {
  patientId: string;
  patientName: string;
  message?: string;
  emergencyNumbers?: string[];
}): Promise<{ location: SosLocation | null; smsSent: boolean }> {
  const location = await getCurrentLocation();

  await sosApi.trigger({
    patientId: params.patientId,
    message: params.message,
    location: location ?? undefined,
  });

  let smsSent = false;
  if (params.emergencyNumbers && params.emergencyNumbers.length > 0) {
    smsSent = await sendEmergencySMS(params.emergencyNumbers, params.patientName, location);
  }

  return { location, smsSent };
}
