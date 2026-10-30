# ⚡ VoltMate Mobile App (Frontend)

> **React Native (Expo SDK 52 + Expo Router v4) + TypeScript + NativeWind v4**  
> *India-Specific Peer-to-Peer (P2P) EV Charger Sharing, Route Matching & Public Grid Aggregation App (Android & iOS)*

---

## 🎨 UI/UX Design System: "Bioluminescent Kinetic Dark"
* **Deep Obsidian Canvas:** `#06090E`
* **Midnight Slate Card:** `#0F1622`
* **Driver Accent:** Volt Emerald (`#00F59B`)
* **Host Accent:** Solar Amber (`#FFB800`)
* **Public Fast DC Accent:** Cyber Cyan (`#00E5FF`)
* **Engine:** `@shopify/react-native-skia` (Liquid battery wave shaders) + `react-native-reanimated` (120fps physics & Mode Shockwave) + Google ML Kit Text Recognition on-device OCR.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your backend host (e.g. http://192.168.1.150:8000/api/v1)
```

### 3. Run Development Server
```bash
npx expo start
```
* Press `w` to open web preview in browser.
* Press `a` for Android emulator.
* Scan QR code using Expo Go app on your physical phone.

---

## 📱 Standalone Android Build (APK)
```bash
cd android
./gradlew assembleDebug
```
Output APK is located at:
`android/app/build/outputs/apk/debug/app-debug.apk`
