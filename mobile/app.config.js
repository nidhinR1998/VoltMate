module.exports = ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      package: "com.voltmate.app",
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.VIBRATE",
      ],
      config: {
        ...(config.android?.config || {}),
        googleMaps: {
          apiKey:
            process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ||
            "YOUR_ANDROID_GOOGLE_MAPS_API_KEY",
        },
      },
    },
    ios: {
      ...config.ios,
      bundleIdentifier: "com.voltmate.app",
      config: {
        ...(config.ios?.config || {}),
        googleMapsApiKey:
          process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY ||
          "YOUR_IOS_GOOGLE_MAPS_API_KEY",
      },
    },
  };
};

