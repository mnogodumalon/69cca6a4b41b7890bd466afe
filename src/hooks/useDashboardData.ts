import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Rechnungsverwaltung, Leistungskatalog, Mitarbeiterverwaltung, Kundenverwaltung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [rechnungsverwaltung, setRechnungsverwaltung] = useState<Rechnungsverwaltung[]>([]);
  const [leistungskatalog, setLeistungskatalog] = useState<Leistungskatalog[]>([]);
  const [mitarbeiterverwaltung, setMitarbeiterverwaltung] = useState<Mitarbeiterverwaltung[]>([]);
  const [kundenverwaltung, setKundenverwaltung] = useState<Kundenverwaltung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [rechnungsverwaltungData, leistungskatalogData, mitarbeiterverwaltungData, kundenverwaltungData] = await Promise.all([
        LivingAppsService.getRechnungsverwaltung(),
        LivingAppsService.getLeistungskatalog(),
        LivingAppsService.getMitarbeiterverwaltung(),
        LivingAppsService.getKundenverwaltung(),
      ]);
      setRechnungsverwaltung(rechnungsverwaltungData);
      setLeistungskatalog(leistungskatalogData);
      setMitarbeiterverwaltung(mitarbeiterverwaltungData);
      setKundenverwaltung(kundenverwaltungData);
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
        const [rechnungsverwaltungData, leistungskatalogData, mitarbeiterverwaltungData, kundenverwaltungData] = await Promise.all([
          LivingAppsService.getRechnungsverwaltung(),
          LivingAppsService.getLeistungskatalog(),
          LivingAppsService.getMitarbeiterverwaltung(),
          LivingAppsService.getKundenverwaltung(),
        ]);
        setRechnungsverwaltung(rechnungsverwaltungData);
        setLeistungskatalog(leistungskatalogData);
        setMitarbeiterverwaltung(mitarbeiterverwaltungData);
        setKundenverwaltung(kundenverwaltungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const leistungskatalogMap = useMemo(() => {
    const m = new Map<string, Leistungskatalog>();
    leistungskatalog.forEach(r => m.set(r.record_id, r));
    return m;
  }, [leistungskatalog]);

  const mitarbeiterverwaltungMap = useMemo(() => {
    const m = new Map<string, Mitarbeiterverwaltung>();
    mitarbeiterverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [mitarbeiterverwaltung]);

  const kundenverwaltungMap = useMemo(() => {
    const m = new Map<string, Kundenverwaltung>();
    kundenverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kundenverwaltung]);

  return { rechnungsverwaltung, setRechnungsverwaltung, leistungskatalog, setLeistungskatalog, mitarbeiterverwaltung, setMitarbeiterverwaltung, kundenverwaltung, setKundenverwaltung, loading, error, fetchAll, leistungskatalogMap, mitarbeiterverwaltungMap, kundenverwaltungMap };
}