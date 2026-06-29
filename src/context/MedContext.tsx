import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { medicationApi, Medication, MedicationLog } from "../api";
import { scheduleMedicationAlarms } from "../services/notifications";

interface MedCtx {
  medications: Medication[];
  history: MedicationLog[];
  loading: boolean;
  loadMeds: (patientId: string) => Promise<void>;
  markTaken: (medicationId: string) => Promise<void>;
  isTakenToday: (medicationId: string) => boolean;
}

const MedContext = createContext<MedCtx>({} as MedCtx);

export function MedProvider({ children }: { children: React.ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [history, setHistory]         = useState<MedicationLog[]>([]);
  const [loading, setLoading]         = useState(false);
  const [patientId, setPatientId]     = useState<string | null>(null);

  const loadMeds = useCallback(async (pid: string) => {
    setLoading(true);
    setPatientId(pid);
    try {
      const [{ medications: list }, { history: logs }] = await Promise.all([
        medicationApi.getForPatient(pid),
        medicationApi.getHistory(pid),
      ]);
      setMedications(list);
      setHistory(logs);
      // Schedule local alarms for all medications
      await scheduleMedicationAlarms(list);
    } catch (e) {
      console.warn("loadMeds error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const markTaken = useCallback(async (medicationId: string) => {
    const { log } = await medicationApi.markTaken(medicationId);
    setHistory(h => [log, ...h]);
  }, []);

  const isTakenToday = useCallback((medicationId: string): boolean => {
    const today = new Date().toDateString();
    return history.some(
      l => l.medicationId === medicationId &&
           l.status === "taken" &&
           new Date(l.takenAt).toDateString() === today
    );
  }, [history]);

  return (
    <MedContext.Provider value={{ medications, history, loading, loadMeds, markTaken, isTakenToday }}>
      {children}
    </MedContext.Provider>
  );
}

export const useMeds = () => useContext(MedContext);
