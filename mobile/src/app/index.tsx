import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(auth)/splash");
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#F2F4F3", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#05E660" />
    </View>
  );
}
