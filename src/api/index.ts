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
  dob?: string;
  medicalHistory?: string;
  linkedFamilyIds?: string[];
  qrToken?: string;
  inviteCode?: string;
}

export interface Medication {
  _id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  instructions?: string;
  duration?: string;
  photoUrl?: string;
}

export interface MedicationLog {
  _id: string;
  medicationId: string;
  status: "taken" | "missed" | "late";
  takenAt: string;
}

export interface HealthLog {
  _id: string;
  patientId: string;
  bp?: string;
  heartRate?: number;
  bloodSugar?: number;
  weight?: number;
  notes?: string;
  loggedAt: string;
}

export interface Appointment {
  _id: string;
  patientId: string;
  title: string;
  dateTime: string;
  doctorName?: string;
  location?: string;
  notes?: string;
  completed: boolean;
}

export interface SosEvent {
  _id: string;
  patientId: string;
  message?: string;
  location?: { lat: number; lng: number };
  resolved: boolean;
  createdAt: string;
}

// ─── Auth API ────────────────────────────────────────────────────────────────

export const authApi = {
  register: (body: { name: string; email: string; password: string; role: Role }) =>
    http.post<{ token: string; user: User }>("/auth/register", body),

  login: (body: { email: string; password: string }) =>
    http.post<{ token: string; user: User }>("/auth/login", body),

  qrLogin: (body: { qrToken: string }) =>
    http.post<{ token: string; user: User }>("/auth/qr-login", body),

  getMe: () => http.get<{ user: User }>("/auth/me"),
};

// ─── Patient API ─────────────────────────────────────────────────────────────

export const patientApi = {
  create:    (body: Partial<Patient>) => http.post<{ patient: Patient }>("/patients", body),
  getAll:    () => http.get<{ patients: Patient[] }>("/patients"),
  getById:   (id: string) => http.get<{ patient: Patient }>(`/patients/${id}`),
  getMe:     () => http.get<{ patient: Patient }>("/patients/me"),
  getLinked: () => http.get<{ patient: Patient }>("/patients/linked"),
  linkFamily:(body: { patientId: string; familyUserId: string }) =>
    http.post<{ message: string }>("/patients/link-family", body),
};

// ─── Medication API ───────────────────────────────────────────────────────────

export const medicationApi = {
  create:       (body: Partial<Medication>) => http.post<{ medication: Medication }>("/medications", body),
  getForPatient:(patientId: string) => http.get<{ medications: Medication[] }>(`/medications/patient/${patientId}`),
  markTaken:    (medicationId: string) => http.post<{ log: MedicationLog }>(`/medications/${medicationId}/taken`, {}),
  getHistory:   (patientId: string) => http.get<{ history: MedicationLog[] }>(`/medications/patient/${patientId}/history`),
};

// ─── Health API ───────────────────────────────────────────────────────────────

export const healthApi = {
  log:        (body: Partial<HealthLog>) => http.post<{ log: HealthLog }>("/health-logs", body),
  getForPatient:(patientId: string) => http.get<{ logs: HealthLog[] }>(`/health-logs/patient/${patientId}`),
  getToday:   (patientId: string) => http.get<{ log: HealthLog }>(`/health-logs/patient/${patientId}/today`),
  getSummary: (patientId: string) => http.get<any>(`/health-logs/patient/${patientId}/summary`),
};

// ─── Appointment API ──────────────────────────────────────────────────────────

export const appointmentApi = {
  create:     (body: Partial<Appointment>) => http.post<{ appointment: Appointment }>("/appointments", body),
  getUpcoming:(patientId: string) => http.get<{ appointments: Appointment[] }>(`/appointments/patient/${patientId}/upcoming`),
  getAll:     (patientId: string) => http.get<{ appointments: Appointment[] }>(`/appointments/patient/${patientId}`),
  complete:   (id: string) => http.patch<{ appointment: Appointment }>(`/appointments/${id}/complete`),
};

// ─── SOS API ─────────────────────────────────────────────────────────────────

export const sosApi = {
  trigger:    (body: { patientId: string; message?: string; location?: { lat: number; lng: number } }) =>
    http.post<{ sos: SosEvent }>("/sos", body),
  getHistory: (patientId: string) => http.get<{ events: SosEvent[] }>(`/sos/patient/${patientId}`),
  resolve:    (id: string) => http.patch<{ sos: SosEvent }>(`/sos/${id}/resolve`),
};
