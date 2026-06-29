# NurseCare+ — Expo App (Phase 1 + 2 + 3)

Post-discharge patient care platform for **Nurse**, **Patient**, and **Family** roles.

---

## What's Built

| Phase | Features | Status |
|---|---|---|
| **1** | Auth, QR login, role dashboards | ✅ |
| **2** | Medication list, mark taken, local alarms, missed-dose alerts | ✅ |
| **3** | Health log (BP/HR/sugar/weight), 7-day trend charts, danger signs checklist | ✅ |
| **4** | Diet plan, follow-up calendar | 🔜 |
| **5** | Full SOS (SMS + location), FCM push to family | 🔜 |

---

## Setup

```bash
unzip nursecare-plus.zip && cd nursecare
npm install --legacy-peer-deps

# Set your backend URL:
echo "EXPO_PUBLIC_API_URL=https://your-api.onrender.com/api" > .env

npx expo start
```

Scan QR in **Expo Go** on your phone.

> On physical device: use your machine's local IP, not `localhost`.

---

## Phase 2 — Medications

- **Full medication list** with dosage, times, instructions
- **Mark as Taken** — updates backend + logs locally
- **Local alarms** via `expo-notifications` — fires at scheduled times daily
- **Missed-dose alert** — trigger a notification if patient hasn't marked taken
- **History strip** — scrollable taken/missed log at bottom of screen
- **Detail modal** — tap any med to see full info + take action

## Phase 3 — Health Logs

- **Log vitals** — BP, heart rate, blood sugar, weight, notes
- **Today's vitals card** on overview tab
- **7-day sparkline charts** for heart rate, blood sugar, weight (no external chart lib — pure RN Views)
- **Status indicator** — Stable / Monitor based on readings
- **History tab** — full log list with all recorded vitals
- **Danger Signs Checklist** — 6 symptoms; any YES → red warning + SOS prompt

---

## File Structure

```
app/
  (auth)/  login, register, qr-scan
  (tabs)/
    home.tsx             → routes to role-specific home
    profile.tsx
    nurse/   home, patients, create-patient
    patient/ home, medications, health      ← Phase 2 + 3
    family/  home, dashboard
src/
  api/         client.ts, index.ts
  context/     AuthContext.tsx, MedContext.tsx   ← Phase 2
  services/    notifications.ts                  ← Phase 2
  components/  UI.tsx
  theme/       index.ts
```
