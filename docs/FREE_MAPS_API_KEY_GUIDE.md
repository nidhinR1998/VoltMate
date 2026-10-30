# Zero-Cost Native Google Maps & Ola Maps API Key Setup Guide

VoltMate uses a **100% Zero-Cost Hybrid Map Architecture**:
1. **Map Rendering (`$0.00` Unlimited):** Uses native `react-native-maps` (`PROVIDER_GOOGLE`) with `Maps SDK for Android` and `Maps SDK for iOS` (without a paid `googleMapId`).
2. **Directions & Road Corridor Polylines (`₹0.00`):** Uses **Ola Maps Directions API** when `EXPO_PUBLIC_OLA_MAPS_API_KEY` is configured, with an automatic zero-key fallback to **OSRM (`router.project-osrm.org`)**.
3. **Places Autocomplete & Geocoding (`₹0.00`):** Uses **Ola Maps Autocomplete** when `EXPO_PUBLIC_OLA_MAPS_API_KEY` is configured, with an automatic zero-key fallback to **Photon Komoot OpenStreetMap (`photon.komoot.io`)**.

---

## Key #1: Google Maps Native SDK Key (Android & iOS Map + Satellite + Traffic View)

Because VoltMate renders maps using the native **Maps SDK for Android** and **Maps SDK for iOS**, Google provides **unlimited free mobile map loads ($0.00 cost)**.

### Step 1: Create Your Project in Google Cloud Console
1. Open **[console.cloud.google.com](https://console.cloud.google.com/)** and sign in with your Google account.
2. Click the project dropdown at the top left -> click **New Project** -> name it **`VoltMate`** -> click **Create**.
3. Link a billing profile if prompted (Google takes a ₹2 refundable verification auth and grants **$300 / ~₹25,000 in free credits**, and Mobile Map SDK loads cost **$0.00**).

### Step 2: Enable ONLY the Two Free Mobile Map SDKs
1. Go to **APIs & Services -> Library**.
2. Search for **`Maps SDK for Android`** -> click **Enable**.
3. Search for **`Maps SDK for iOS`** -> click **Enable**.
> **CRITICAL COST-SAVING RULE:** Do **NOT** enable "Places API", "Directions API", or "Routes API" in Google Cloud. Keeping those disabled makes it 100% impossible for your project to ever trigger a paid Google Maps API call.

### Step 3: Generate & Lock Down Your Keys
1. Go to **APIs & Services -> Credentials** -> click **+ Create Credentials -> API Key**.
2. Edit the first key:
   - **Name:** `VoltMate-Android-Key`
   - **API restrictions:** Select **Restrict key** -> check **ONLY** **`Maps SDK for Android`** -> click **Save**.
3. (Optional for iOS) Create a second key:
   - **Name:** `VoltMate-iOS-Key`
   - **API restrictions:** Select **Restrict key** -> check **ONLY** **`Maps SDK for iOS`** -> click **Save**.

---

## Key #2: Ola Maps API Key (Optional — 5,000,000 Free Calls/Month)

VoltMate works out-of-the-box with zero routing key using **OSRM + Photon OpenStreetMap**. To enable hyper-local Indian apartment/street search and routing via **Ola Maps (Krutrim)** for ₹0:

1. Go to **[maps.olakrutrim.com](https://maps.olakrutrim.com/)** and sign in.
2. Select the **Free Developer Tier** (**5,000,000 free credits/month**).
3. Go to **Projects -> Create New Project** -> name it **`VoltMate`**.
4. Open the **API Keys** tab -> click **Generate API Key** and copy the key.

---

## Step 4: Configure Your Keys in `mobile/.env`

Paste your keys into `mobile/.env` (and `backend/.env` if desired):

```env
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY=AIzaSyYourActualAndroidKeyHere
EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY=AIzaSyYourActualIosKeyHere
EXPO_PUBLIC_OLA_MAPS_API_KEY=your_ola_maps_api_key_here
```

Also update `mobile/android/app/src/main/AndroidManifest.xml` (or run `build_apk.ps1`, which automatically injects `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` from `mobile/.env` into `AndroidManifest.xml` before building!).

