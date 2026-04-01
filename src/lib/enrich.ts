import type { EnrichedRechnungsverwaltung } from '@/types/enriched';
import type { Kundenverwaltung, Leistungskatalog, Mitarbeiterverwaltung, Rechnungsverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface RechnungsverwaltungMaps {
  kundenverwaltungMap: Map<string, Kundenverwaltung>;
  mitarbeiterverwaltungMap: Map<string, Mitarbeiterverwaltung>;
  leistungskatalogMap: Map<string, Leistungskatalog>;
}

export function enrichRechnungsverwaltung(
  rechnungsverwaltung: Rechnungsverwaltung[],
  maps: RechnungsverwaltungMaps
): EnrichedRechnungsverwaltung[] {
  return rechnungsverwaltung.map(r => ({
    ...r,
    kunde_refName: resolveDisplay(r.fields.kunde_ref, maps.kundenverwaltungMap, 'kundennummer'),
    mitarbeiter_refName: resolveDisplay(r.fields.mitarbeiter_ref, maps.mitarbeiterverwaltungMap, 'mitarbeiter_vorname'),
    leistungen_refName: resolveDisplay(r.fields.leistungen_ref, maps.leistungskatalogMap, 'leistungsbezeichnung'),
  }));
}
