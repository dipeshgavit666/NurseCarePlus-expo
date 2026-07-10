import { http } from "./client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Role = "nurse" | "patient" | "family";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Patient {
  _id: string;
  name: string;
  userId: string;
  diagnosis?: string;
  diagnosisDetails?: string;
  age?: number;
  dob?: string;
  healthStatus: string;
  medicalHistory?: string;
  linkedFamilyIds?: string[];
  qrCode?: string;
  inviteCode?: string;
  customDiet?: { eat: string[]; avoid: string[] };
}

export interface Medication {
  _id: string;
  patientId: string;
  name: string;
  dose: string;
  unit: string;
  instructions?: string;
  photoUrl?: string;
  schedule: { time: string; taken: boolean; takenAt?: string }[];
  isOngoing: boolean;
  active: boolean;
}

export interface MedicationLog {
  _id: string;
  medicationId: string;
  status: "taken" | "missed" | "late";
  scheduledTime: string;
  takenAt?: string;
  date: string;
}

export interface HealthLog {
  _id: string;
  patientId: string;
  bp?: { systolic: number; diastolic: number };
  pulse?: number;
  bloodSugar?: number;
  weight?: number;
  notes?: string;
  date: string;
}

export interface Appointment {
  _id: string;
  patientId: string;
  type: "follow_up" | "lab_test" | "hospital_visit";
  title: string;
  doctorName?: string;
  facilityName: string;
  address: string;
  dateTime: string;
  notes?: string;
  completed: boolean;
}

export interface SosEvent {
  _id: string;
  patientId: string;
  triggeredAt: string;
  location?: { latitude: number; longitude: number };
  contactsNotified: string[];
  resolved: boolean;
}

// ─── Auth API ────────────────────────────────────────────────────────────────
// NOTE: qrLogin sends `qrData` (a raw JSON string, exactly as scanned from the
// QR code) — this MUST match the backend's `req.body.qrData` field name in
// auth.controller.ts. Sending anything else (e.g. `qrToken`) silently breaks
// QR login because JSON.parse(undefined) throws server-side.

export const authApi = {
  register: (body: {
    name: string;
    email: string;
    password: string;
    role: Role;
    phone?: string;
  }) => http.post<{ token: string; user: User }>("/auth/register", body),

  login: (body: { email: string; password: string }) =>
    http.post<{ token: string; user: User }>("/auth/login", body),

  qrLogin: (body: { qrData: string }) =>
    http.post<{ token: string; user: User }>("/auth/qr-login", body),

  getMe: () => http.get<{ user: User }>("/auth/me"),
};

// ─── Patient API ─────────────────────────────────────────────────────────────

export const patientApi = {
  create: (body: Partial<Patient> & { emergencyContacts?: any[] }) =>
    http.post<{ patient: Patient; qrCode: string }>("/patients", body),
  getAll: () => http.get<{ patients: Patient[] }>("/patients"),
  getById: (id: string) => http.get<{ patient: Patient }>(`/patients/${id}`),
  getMe: () => http.get<{ patient: Patient }>("/patients/me"),
  getLinked: () => http.get<{ patient: Patient }>("/patients/linked"),
  linkFamily: (body: { inviteCode: string }) =>
    http.post<{ patient: Patient }>("/patients/link-family", body),
  updateDiet: (patientId: string, body: { eat: string[]; avoid: string[] }) =>
    http.patch<{ patient: Patient }>(`/patients/${patientId}/diet`, body),
  updateHealthStatus: (patientId: string, healthStatus: string) =>
    http.patch<{ patient: Patient }>(`/patients/${patientId}/health-status`, {
      healthStatus,
    }),
};

// ─── Medication API ────────────────────────────────────────────────────────

export const medicationApi = {
  create: (body: Partial<Medication>) =>
    http.post<{ medication: Medication }>("/medications", body),
  getForPatient: (patientId: string) =>
    http.get<{ medications: Medication[] }>(
      `/medications/patient/${patientId}`,
    ),
  markTaken: (medicationId: string, scheduledTime: string) =>
    http.post<{ log: MedicationLog }>(`/medications/${medicationId}/taken`, {
      scheduledTime,
    }),
  getHistory: (patientId: string, days = 7) =>
    http.get<{ logs: MedicationLog[] }>(
      `/medications/patient/${patientId}/history?days=${days}`,
    ),
};

// ─── Health API ───────────────────────────────────────────────────────────

export const healthApi = {
  log: (body: Partial<HealthLog> & { patientId: string }) =>
    http.post<{ log: HealthLog; alerts: string[] }>("/health-logs", body),
  getForPatient: (patientId: string, days = 30) =>
    http.get<{ logs: HealthLog[] }>(
      `/health-logs/patient/${patientId}?days=${days}`,
    ),
  getToday: (patientId: string) =>
    http.get<{ log: HealthLog | null }>(
      `/health-logs/patient/${patientId}/today`,
    ),
  getSummary: (patientId: string) =>
    http.get<any>(`/health-logs/patient/${patientId}/summary`),
};

// ─── Appointment API ────────────────────────────────────────────────────────

export const appointmentApi = {
  create: (body: Partial<Appointment>) =>
    http.post<{ appointment: Appointment }>("/appointments", body),
  getUpcoming: (patientId: string) =>
    http.get<{ appointments: Appointment[] }>(
      `/appointments/patient/${patientId}/upcoming`,
    ),
  getAll: (patientId: string) =>
    http.get<{ appointments: Appointment[] }>(
      `/appointments/patient/${patientId}`,
    ),
  complete: (id: string) =>
    http.patch<{ appointment: Appointment }>(`/appointments/${id}/complete`),
};

// ─── SOS API ────────────────────────────────────────────────────────────────

export const sosApi = {
  trigger: (body: {
    patientId: string;
    location?: { latitude: number; longitude: number } | null;
  }) => http.post<{ event: SosEvent }>("/sos", body),
  getHistory: (patientId: string) =>
    http.get<{ events: SosEvent[] }>(`/sos/patient/${patientId}`),
  resolve: (id: string) =>
    http.patch<{ event: SosEvent }>(`/sos/${id}/resolve`),
};

// ─── User API ───────────────────────────────────────────────────────────────

export const userApi = {
  savePushToken: (token: string) =>
    http.post<{ success: boolean }>("/users/push-token", { token }),
};
