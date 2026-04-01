import type { Rechnungsverwaltung } from './app';

export type EnrichedRechnungsverwaltung = Rechnungsverwaltung & {
  kunde_refName: string;
  mitarbeiter_refName: string;
  leistungen_refName: string;
};
