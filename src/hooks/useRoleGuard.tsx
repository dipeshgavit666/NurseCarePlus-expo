import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { Role } from "../api";
import { LoadingScreen } from "../components/common/UI";

/**
 * Renders nothing (redirects home) if the logged-in user's role isn't in
 * `allowed`. This is the actual role-based access control — hiding a tab
 * with `href: null` only hides it from the tab bar, it does NOT stop the
 * screen from being reachable. Put this at the top of every role-specific
 * screen:
 *
 *   const guard = useRoleGuard(["nurse"]);
 *   if (guard) return guard;
 */
export function useRoleGuard(allowed: Role[]) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!allowed.includes(user.role)) return <Redirect href="/(tabs)/home" />;
  return null;
}
