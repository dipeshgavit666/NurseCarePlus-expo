# NurseCare+ — Complete Expo App (Phases 1–5)

Post-discharge patient care platform for **Nurse**, **Patient**, and **Family** roles. Full implementation of all 5 phases from the original spec.

---

## Phase Coverage

| Phase | Features | Status |
|---|---|---|
| **1** | Auth (email + role), QR scan login, role-based dashboards | ✅ |
| **2** | Medication list, mark-taken flow, local daily alarms, missed-dose alert | ✅ |
| **3** | Health logging (BP/HR/sugar/weight), 7-day trend charts, danger sign checklist | ✅ |
| **4** | Diet plan (auto-assigned by diagnosis), Follow-up calendar (appointments/labs/hospital visits) | ✅ |
| **5** | Full SOS — live location, SMS to emergency contact, one-tap ambulance call, family SOS trigger | ✅ |

---

## Setup

```bash
unzip nursecare-complete.zip && cd nursecare
npm install --legacy-peer-deps

# Point at your backend:
echo "EXPO_PUBLIC_API_URL=https://your-api.onrender.com/api" > .env

npx expo start
```

Scan the QR in **Expo Go**. On a physical device, use your machine's local IP instead of `localhost`.

> Camera, notifications, and location permissions are pre-configured in `app.json`.

---

## Screens by Role

### 👩‍⚕️ Nurse
- **Home** — patient count, quick actions, recent patients
- **Patients** — full list with diagnosis + linked family count
- **New Patient** — create profile, generates QR token + invite code
- **Calendar** — create/view/complete appointments for any patient

### 🧑‍🦽 Patient
- **Home** — diagnosis, next medication countdown, next appointment, SOS shortcut
- **Medications** — mark taken, local alarms fire daily, missed-dose alert, history strip
- **Health** — log vitals, 7-day sparkline charts, danger signs checklist
- **Diet** — Eat This / Avoid This cards auto-matched to diagnosis
- **Calendar** — upcoming + past follow-ups, lab tests, hospital visits
- **SOS** — big red button: captures location → logs event → sends SMS → call ambulance

### 👨‍👩‍👧 Family
- **Dashboard** — linked patient's vitals, medications, upcoming appointments
- **SOS button** — family can also trigger SOS on patient's behalf
- Alerts panel (placeholder for FCM push — see "What's Simulated" below)

---

## What's Simulated vs Real

| Feature | Implementation |
|---|---|
| QR generation | Backend-driven — app just scans & calls `/auth/qr-login` |
| Local medication alarms | **Real** — `expo-notifications` schedules actual daily triggers |
| Missed-dose alert | Manual trigger button (real notification fires); auto 30-min timer requires a backend cron + push service in production |
| SOS location | **Real** — `expo-location` gets live GPS coords |
| SOS SMS | **Real** — opens native SMS composer via `expo-sms` with prefilled message + Google Maps link |
| SOS call | **Real** — opens native dialer via deep link |
| Family push notifications | Placeholder — needs FCM/Expo Push Token registration (the `/users/push-token` endpoint exists in `api/index.ts`, ready to wire up) |
| Diet plans | Static local rule-based mapping (`src/data/dietPlans.ts`) by diagnosis keyword; nurse customization not yet built |

---

## File Structure

```
app/
  _layout.tsx               # Root: GestureHandler + AuthProvider + MedProvider
  index.tsx                 # Auth gate
  (auth)/
    login.tsx               # Role tabs + email/password + QR button
    register.tsx            # Role picker + form
    qr-scan.tsx              # Camera QR scanner
  (tabs)/
    _layout.tsx              # Role-aware bottom tabs
    home.tsx                 # Routes to role-specific home
    profile.tsx               # Phase 1
    nurse/
      home.tsx, patients.tsx, create-patient.tsx
    patient/
      home.tsx                # Phase 1 (updated for live med status)
      medications.tsx          # Phase 2
      health.tsx                # Phase 3
      diet.tsx                  # Phase 4
      appointments.tsx          # Phase 4 (follow-up calendar)
      sos.tsx                   # Phase 5
    family/
      home.tsx, dashboard.tsx   # Phase 1 (updated with SOS + calendar link)
src/
  api/
    client.ts, index.ts        # Typed API layer
  context/
    AuthContext.tsx            # Phase 1
    MedContext.tsx              # Phase 2 — live taken status across screens
  services/
    notifications.ts            # Phase 2 — local alarm scheduling
    sos.ts                      # Phase 5 — location + SMS + call
  data/
    dietPlans.ts                 # Phase 4 — diagnosis → diet plan mapping
  components/common/UI.tsx
  theme/index.ts
```

---

## Next Steps (Beyond Spec)

- Wire up `userApi.savePushToken()` (already defined) with `expo-notifications` push token registration for real FCM-style family alerts
- Add invite-code linking flow for family (`patientApi.linkFamily`) — currently family must already be linked server-side
- Backend cron job to auto-fire missed-dose alerts 30 min after scheduled time (app-side trigger is manual for now)
- Nurse-side diet plan customization UI
