import React, { createContext, useContext, useState, useCallback } from "react";
import { medicationApi, Medication, MedicationLog } from "../api";
import { scheduleMedicationAlarms } from "../services/notifications";

interface MedCtx {
  medications: Medication[];
  history: MedicationLog[];
  loading: boolean;
  loadMeds: (patientId: string) => Promise<void>;
  markTaken: (medicationId: string, scheduledTime: string) => Promise<void>;
  isTakenToday: (medicationId: string, scheduledTime?: string) => boolean;
}

const MedContext = createContext<MedCtx>({} as MedCtx);

export function MedProvider({ children }: { children: React.ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [history, setHistory] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMeds = useCallback(async (pid: string) => {
    setLoading(true);
    try {
      const [{ medications: list }, { logs }] = await Promise.all([
        medicationApi.getForPatient(pid),
        medicationApi.getHistory(pid),
      ]);
      setMedications(list);
      setHistory(logs);
      await scheduleMedicationAlarms(list);
    } catch (e) {
      console.warn("loadMeds error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Backend requires `scheduledTime` (HH:MM) to know which schedule slot was
  // marked — the previous frontend never sent it, which crashes the
  // markAsTaken controller (`scheduledTime.split` on undefined).
  const markTaken = useCallback(async (medicationId: string, scheduledTime: string) => {
    const { log } = await medicationApi.markTaken(medicationId, scheduledTime);
    setHistory(h => [log, ...h]);
  }, []);

  const isTakenToday = useCallback((medicationId: string, scheduledTime?: string): boolean => {
    const today = new Date().toDateString();
    return history.some(
      l => l.medicationId === medicationId &&
           l.status === "taken" &&
           (!scheduledTime || l.scheduledTime === scheduledTime) &&
           l.takenAt && new Date(l.takenAt).toDateString() === today
    );
  }, [history]);

  return (
    <MedContext.Provider value={{ medications, history, loading, loadMeds, markTaken, isTakenToday }}>
      {children}
    </MedContext.Provider>
  );
}

export const useMeds = () => useContext(MedContext);
