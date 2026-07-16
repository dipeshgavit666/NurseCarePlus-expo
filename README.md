# NurseCare+ (Mobile App)

Expo / React Native mobile app for **NurseCare+**, a post-discharge care platform. Provides role-specific experiences for nurses, patients, and family caregivers: medication tracking, health logging, appointment scheduling, diet plans, and emergency SOS.

## Tech Stack

- **Framework**: Expo SDK 56 + Expo Router (file-based routing)
- **UI**: React Native 0.85, React 19
- **State**: React Context (`AuthContext`, `MedContext`) + `AsyncStorage`
- **Navigation**: `expo-router` with role-gated tabs
- **Native modules**: `expo-camera` (QR scanning), `expo-location`, `expo-sms`, `expo-notifications`, `expo-image-picker`, `react-native-svg`
- **Language**: TypeScript

## Project Structure

```
app/
├── _layout.tsx                # Root layout — Auth/Med providers, gesture handler
├── index.tsx                  # Entry redirect based on auth state
├── (auth)/                    # Login, register, QR scan, family link
│   ├── login.tsx
│   ├── register.tsx
│   ├── qr-scan.tsx
│   └── link-patient.tsx
└── (tabs)/                    # Authenticated, role-gated tab screens
    ├── home.tsx                # Dispatches to role-specific home
    ├── nurse/                  # Patients list, create patient, patient detail,
    │                           # add medication/appointment, edit diet
    ├── patient/                # Home, medications, health, diet, appointments, SOS
    ├── family/                 # Dashboard (read-only monitoring + SOS)
    └── profile.tsx

src/
├── api/                        # Typed API client (client.ts + index.ts)
├── context/                    # AuthContext, MedContext
├── hooks/useRoleGuard.tsx      # Per-screen role-based access control
├── services/                   # sos.ts, notifications.ts (local push scheduling)
├── data/dietPlans.ts           # Diagnosis-based diet plan data
├── components/common/          # Reusable UI kit (Button, Card, Input, etc.)
└── theme/                      # Colors, spacing, radius, shadows
```

## Roles & Screens

| Role     | Home tab shows | Key screens |
|----------|-----------------|-------------|
| **Nurse** | Patient list & quick actions | Create patient (generates QR + invite code), patient detail, add medication/appointment, edit diet |
| **Patient** | Care summary, next med, next appointment | Medications (mark taken), Health (log vitals, trends), Diet, Appointments, SOS |
| **Family** | Linked patient's live status | Read-only vitals/medications/appointments, SOS trigger, invite-code linking |

Access control is enforced at the screen level via `useRoleGuard(["role"])` — hiding a tab from the tab bar alone does not block navigation to it, so every role-specific screen calls this guard first.

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npx expo`)
- A running instance of the [NurseCare+ API](#) backend
- Expo Go app, or a dev build, for testing on device

### Install

```bash
npm install
```

### Configure environment

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_API_URL=https://your-backend-url/api
```

If unset, the app falls back to a deployed default in `src/api/client.ts`. Point this at your local backend (e.g. `http://<your-lan-ip>:5000/api`) when developing against a local API — `localhost` won't resolve from a physical device.

### Assets

App icons and splash assets live in `assets/images/`. `app.json` references:
- `assets/images/icon.png` — app icon
- `assets/images/android-icon-foreground.png` — Android adaptive icon foreground

If you fork this project, replace these with your own branding; if they're missing, the build will fail until you add them.

### Run

```bash
npx expo start          # start the dev server (scan QR with Expo Go)
npm run android          # run on Android
npm run ios              # run on iOS
npm run web               # run in browser
```

## Authentication Flow

- **Nurse / Family**: register or log in with email + password (`authApi.register` / `authApi.login`).
- **Patient**: patients do **not** register directly. A nurse creates the patient profile from the app, which generates a QR code and a 6-character family invite code. The patient logs in by scanning that QR code (`app/(auth)/qr-scan.tsx` → `authApi.qrLogin`).
- **Family**: after registering, a family member links to a patient by entering the patient's invite code (`app/(auth)/link-patient.tsx` or the in-app prompt on the family dashboard).
- Auth tokens are persisted in `AsyncStorage` and attached automatically to API requests by `src/api/client.ts`.

## Notifications

- **Local scheduled reminders**: `src/services/notifications.ts` schedules daily medication reminders and missed-dose alerts on-device using `expo-notifications`.
- **Push notifications**: the Expo push token is registered with the backend via `userApi.savePushToken`, enabling server-sent alerts for SOS, health alerts, missed medications, and upcoming appointments.

## Emergency SOS

`src/services/sos.ts` orchestrates a full SOS flow:
1. Requests location permission and captures current coordinates.
2. Sends the SOS event to the backend (notifies nurse + linked family via push).
3. Optionally sends an SMS with a Google Maps link to a provided emergency contact number (`expo-sms`).
4. Provides a one-tap "Call Ambulance" action using the configured emergency number.

## Notes

- This project targets **Expo SDK 56**. Before making SDK-related changes, consult the versioned docs at `https://docs.expo.dev/versions/v56.0.0/` (see `AGENTS.md`).
- `expo-router` typed routes are enabled (`experiments.typedRoutes` in `app.json`).
- The medication schedule model (`schedule: [{ time, taken, takenAt }]`) is shared in shape with the backend `Medication` model — keep them in sync when editing either side.
