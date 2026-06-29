import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { LoadingScreen } from "../src/components/common/UI";

export default function Index() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen label="Starting NurseCare+…" />;
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)/home" />;
}
