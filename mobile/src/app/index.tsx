import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Navigate immediately to the auth splash screen
    const timer = setTimeout(() => {
      router.replace("/(auth)/splash");
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#06090E", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#00F59B" />
    </View>
  );
}

