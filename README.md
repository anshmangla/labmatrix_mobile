# LabMatrix Market Mobile 🔬📱

The official cross-platform mobile application for **[LabMatrix Marketplace](https://surplus.labmatrixindia.com)** — India's dedicated B2B platform to buy, sell, and source certified pre-owned, refurbished, and brand-new analytical laboratory equipment (HPLC, GC-MS, Spectrometers, AAS, ICP-OES) and genuine spare parts.

Built with **React Native**, **Expo SDK 58**, **Expo Router**, and **TypeScript**.

---

## 🌟 Key Features

* **Marketplace Discovery:**
  * Real-time search across instruments, spare parts, models, and manufacturers.
  * Filter pills for **All Items**, **Pre-Owned** (`MACHINE`), **Brand New** (`NEW_INSTRUMENT`), and **Spare Parts** (`SPARE_PART`).
  * High-resolution image thumbnails, condition badges, pricing, and location tags.
  * Pull-to-refresh and infinite scrolling feed.

* **Equipment Requirements & Demands:**
  * Browse active equipment requirements posted by research facilities, universities, and diagnostic labs.
  * One-tap **"Fulfill Request"** to propose matching inventory.

* **List Equipment & Spare Parts (Sell Tab):**
  * Multi-step equipment listing workflow.
  * Native camera and photo gallery picker with direct multipart upload to Cloudinary.
  * Auto-categorization, condition selection, OEM part numbers, and price range.

* **Direct Inquiry & Lead Management:**
  * Instant **"Send Inquiry / Request Quote"** modal on all instrument listings.
  * Dedicated Inquiries tab with segmented views: **Received** (leads on your listings) and **Sent** (quotes you requested).

* **Secure Authentication & Account Security:**
  * Hardware-backed encryption via `expo-secure-store` (Keychain on iOS, Keystore on Android).
  * 30-day JWT Bearer token sessions for seamless user experience.
  * Email OTP verification on registration and password reset.
  * In-app permanent account deletion (fully compliant with Apple App Store guidelines).

* **In-App Notification Center:**
  * Real-time updates when equipment listings are approved, status changes, or inquiries are received.
  * Unread counters and "Mark all as read" capability.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | **React Native (0.88) + React 19** | Native mobile execution for iOS and Android |
| **Tooling & Runtime** | **Expo SDK 58** | Modern developer workflow, native modules & assets |
| **Routing** | **Expo Router (v58)** | File-based navigation matching Next.js mental model |
| **State & Cache** | **TanStack Query (React Query)** | Client-side cache, pagination, and background refetching |
| **Networking** | **Axios** | HTTP client with automatic `Authorization: Bearer` interceptor |
| **Security** | **Expo SecureStore** | Hardware-level credential storage |
| **Media Handling** | **Expo ImagePicker** | Camera and gallery integration for equipment photos |
| **Icons** | **Lucide React Native + SVG** | Crisp vector iconography consistent with the web platform |
| **CI / CD / Builds** | **EAS (Expo Application Services)** | Cloud builds for Google Play (AAB) and App Store (IPA) |

---

## 🏗️ Project Architecture

```
labmatrix_mobile/
├── app.json                      # Expo application manifest & bundle configuration
├── eas.json                      # EAS Build & Submit profiles (preview APK, production AAB/IPA)
├── .env.example                  # Environment configuration template
├── src/
│   ├── app/
│   │   ├── _layout.tsx           # Root navigation stack, QueryClient & AuthProvider
│   │   ├── notifications.tsx     # In-app notifications center
│   │   ├── (auth)/
│   │   │   ├── login.tsx         # Email & password sign-in
│   │   │   ├── register.tsx      # Email registration with 6-digit OTP verification
│   │   │   └── forgot-password.tsx # Password reset via OTP
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx       # Bottom tab bar configuration
│   │   │   ├── index.tsx         # Marketplace browse & search
│   │   │   ├── requests.tsx      # Open equipment requirements
│   │   │   ├── sell.tsx          # Equipment / spare part listing submission form
│   │   │   ├── inquiries.tsx     # Received & sent inquiries tracker
│   │   │   └── profile.tsx       # User profile, activity stats & account actions
│   │   ├── listing/
│   │   │   └── [id].tsx          # Instrument details, specs & quote request modal
│   │   └── requests/
│   │       └── [id].tsx          # Requirement details & supply proposal modal
│   ├── context/
│   │   └── auth-context.tsx      # Global auth state, session bootstrap & profile caching
│   ├── lib/
│   │   ├── api.ts                # Axios client with base URL & Bearer token interceptor
│   │   └── storage.ts            # SecureStore wrappers for credentials and user cache
│   └── types/
│       ├── api.ts                # TypeScript interfaces matching Prisma database models
│       └── declarations.d.ts     # Asset type declarations
```

---

## 🚀 Getting Started

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v20+ recommended)
* [Expo Go](https://expo.dev/go) app installed on your physical phone (available on [App Store](https://apps.apple.com/app/expo-go/id982107779) and [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)), or an iOS Simulator / Android Emulator.

### 2. Installation
```bash
git clone https://github.com/anshmangla/labmatrix_mobile.git
cd labmatrix_mobile
npm install
```

### 3. Environment Setup
By default, the app is configured to connect directly to the live production server (`https://surplus.labmatrixindia.com`). 

To configure or test locally, create a `.env` file:
```bash
cp .env.example .env
```

```env
# Live Production Server (Default)
EXPO_PUBLIC_API_URL=https://surplus.labmatrixindia.com

# For local backend testing (replace with your local network IP):
# EXPO_PUBLIC_API_URL=http://192.168.1.X:3000
```

### 4. Running the Development Server
```bash
npx expo start -c
```
* **Physical Device:** Open the **Expo Go** app and scan the QR code displayed in the terminal.
* **Android Emulator:** Press `a`.
* **iOS Simulator:** Press `i` (macOS required).
* **Web Browser:** Press `w`.

---

## 📦 Building & Publishing (EAS)

This project is pre-configured with `eas.json` for **Expo Application Services**.

### Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### 1. Generate an Android Test APK (Direct Installation)
Builds an installable `.apk` file you can download and test on any Android phone without Google Play:
```bash
eas build -p android --profile preview
```

### 2. Production Store Builds
Builds an optimized Android App Bundle (`.aab`) for Google Play and an iOS Archive (`.ipa`) for Apple App Store / TestFlight:
```bash
# Build for all platforms
eas build -p all --profile production

# Or build individually
eas build -p android --profile production
eas build -p ios --profile production
```

### 3. Automated App Store Submission
Once builds complete, submit directly to the store tracks:
```bash
eas submit -p android
eas submit -p ios
```

---

## 🔒 Security & Backend Integration

The app communicates with the **LabMatrix Next.js Backend** hosted on Vercel:
* **Dual Authentication:** The backend accepts both browser cookie sessions (for web) and JWT Bearer tokens (for mobile) on the same endpoints.
* **CORS Support:** Global CORS headers are configured for cross-origin requests.
* **Rate Limiting:** Critical endpoints (login, OTP generation, inquiries) are protected with sliding-window rate limiters.

---

## 📄 License

Private repository & proprietary intellectual property of **LabMatrix India**. All rights reserved.
