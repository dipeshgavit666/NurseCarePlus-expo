import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { AuthProvider } from "../src/context/AuthContext";
import { MedProvider } from "../src/context/MedContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={s.root}>
      <AuthProvider>
        <MedProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </MedProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({ root: { flex: 1 } });
