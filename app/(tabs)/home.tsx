import { useAuth } from "../../src/context/AuthContext";
import NurseHome from "./nurse/home";
import PatientHome from "./patient/home";
import FamilyHome from "./family/home";
import { LoadingScreen } from "../../src/components/common/UI";

export default function Home() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (user?.role === "nurse") return <NurseHome />;
  if (user?.role === "family") return <FamilyHome />;
  return <PatientHome />;
}
