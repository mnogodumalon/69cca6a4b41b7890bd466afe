import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Kundenverwaltung, Mitarbeiterverwaltung, Leistungskatalog, Rechnungsverwaltung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [kundenverwaltung, setKundenverwaltung] = useState<Kundenverwaltung[]>([]);
  const [mitarbeiterverwaltung, setMitarbeiterverwaltung] = useState<Mitarbeiterverwaltung[]>([]);
  const [leistungskatalog, setLeistungskatalog] = useState<Leistungskatalog[]>([]);
  const [rechnungsverwaltung, setRechnungsverwaltung] = useState<Rechnungsverwaltung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [kundenverwaltungData, mitarbeiterverwaltungData, leistungskatalogData, rechnungsverwaltungData] = await Promise.all([
        LivingAppsService.getKundenverwaltung(),
        LivingAppsService.getMitarbeiterverwaltung(),
        LivingAppsService.getLeistungskatalog(),
        LivingAppsService.getRechnungsverwaltung(),
      ]);
      setKundenverwaltung(kundenverwaltungData);
      setMitarbeiterverwaltung(mitarbeiterverwaltungData);
      setLeistungskatalog(leistungskatalogData);
      setRechnungsverwaltung(rechnungsverwaltungData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [kundenverwaltungData, mitarbeiterverwaltungData, leistungskatalogData, rechnungsverwaltungData] = await Promise.all([
          LivingAppsService.getKundenverwaltung(),
          LivingAppsService.getMitarbeiterverwaltung(),
          LivingAppsService.getLeistungskatalog(),
          LivingAppsService.getRechnungsverwaltung(),
        ]);
        setKundenverwaltung(kundenverwaltungData);
        setMitarbeiterverwaltung(mitarbeiterverwaltungData);
        setLeistungskatalog(leistungskatalogData);
        setRechnungsverwaltung(rechnungsverwaltungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const kundenverwaltungMap = useMemo(() => {
    const m = new Map<string, Kundenverwaltung>();
    kundenverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kundenverwaltung]);

  const mitarbeiterverwaltungMap = useMemo(() => {
    const m = new Map<string, Mitarbeiterverwaltung>();
    mitarbeiterverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [mitarbeiterverwaltung]);

  const leistungskatalogMap = useMemo(() => {
    const m = new Map<string, Leistungskatalog>();
    leistungskatalog.forEach(r => m.set(r.record_id, r));
    return m;
  }, [leistungskatalog]);

  return { kundenverwaltung, setKundenverwaltung, mitarbeiterverwaltung, setMitarbeiterverwaltung, leistungskatalog, setLeistungskatalog, rechnungsverwaltung, setRechnungsverwaltung, loading, error, fetchAll, kundenverwaltungMap, mitarbeiterverwaltungMap, leistungskatalogMap };
}