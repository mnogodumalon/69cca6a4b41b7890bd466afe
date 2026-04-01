// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Kundenverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kundennummer?: string;
    firmenname?: string;
    ansprechpartner_vorname?: string;
    ansprechpartner_nachname?: string;
    ansprechpartner_email?: string;
    ansprechpartner_telefon?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    website?: string;
    notizen_kunde?: string;
  };
}

export interface Mitarbeiterverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    mitarbeiter_vorname?: string;
    mitarbeiter_nachname?: string;
    mitarbeiter_email?: string;
    mitarbeiter_telefon?: string;
    rolle?: string;
    stundensatz?: number;
    eintrittsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    notizen_mitarbeiter?: string;
  };
}

export interface Leistungskatalog {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    leistungsbezeichnung?: string;
    leistungsbeschreibung?: string;
    einheit?: LookupValue;
    standardpreis?: number;
    steuersatz_leistung?: LookupValue;
    aktiv?: boolean;
  };
}

export interface Rechnungsverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    rechnungsnummer?: string;
    rechnungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    faelligkeitsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    rechnungsstatus?: LookupValue;
    kunde_ref?: string; // applookup -> URL zu 'Kundenverwaltung' Record
    mitarbeiter_ref?: string; // applookup -> URL zu 'Mitarbeiterverwaltung' Record
    leistungen_ref?: string; // applookup -> URL zu 'Leistungskatalog' Record
    menge?: number;
    nettobetrag?: number;
    steuersatz_rechnung?: LookupValue;
    bruttobetrag?: number;
    zahlungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    zahlungsart?: LookupValue;
    rechnungsdokument?: string;
    notizen_rechnung?: string;
  };
}

export const APP_IDS = {
  KUNDENVERWALTUNG: '69cca67904d6dcbf70bd3438',
  MITARBEITERVERWALTUNG: '69cca67d1dda0328fd80587c',
  LEISTUNGSKATALOG: '69cca67d98bb6b40fd543485',
  RECHNUNGSVERWALTUNG: '69cca67df510d6410e12a8f1',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'leistungskatalog': {
    einheit: [{ key: "stunde", label: "Stunde" }, { key: "tag", label: "Tag" }, { key: "pauschal", label: "Pauschal" }, { key: "woche", label: "Woche" }, { key: "monat", label: "Monat" }],
    steuersatz_leistung: [{ key: "steuersatz_19", label: "19%" }, { key: "steuersatz_7", label: "7%" }, { key: "steuersatz_0", label: "0%" }],
  },
  'rechnungsverwaltung': {
    rechnungsstatus: [{ key: "entwurf", label: "Entwurf" }, { key: "versendet", label: "Versendet" }, { key: "bezahlt", label: "Bezahlt" }, { key: "ueberfaellig", label: "Überfällig" }, { key: "storniert", label: "Storniert" }],
    steuersatz_rechnung: [{ key: "steuersatz_19", label: "19%" }, { key: "steuersatz_7", label: "7%" }, { key: "steuersatz_0", label: "0%" }],
    zahlungsart: [{ key: "ueberweisung", label: "Überweisung" }, { key: "lastschrift", label: "Lastschrift" }, { key: "kreditkarte", label: "Kreditkarte" }, { key: "bar", label: "Bar" }, { key: "paypal", label: "PayPal" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kundenverwaltung': {
    'kundennummer': 'string/text',
    'firmenname': 'string/text',
    'ansprechpartner_vorname': 'string/text',
    'ansprechpartner_nachname': 'string/text',
    'ansprechpartner_email': 'string/email',
    'ansprechpartner_telefon': 'string/tel',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'website': 'string/url',
    'notizen_kunde': 'string/textarea',
  },
  'mitarbeiterverwaltung': {
    'mitarbeiter_vorname': 'string/text',
    'mitarbeiter_nachname': 'string/text',
    'mitarbeiter_email': 'string/email',
    'mitarbeiter_telefon': 'string/tel',
    'rolle': 'string/text',
    'stundensatz': 'number',
    'eintrittsdatum': 'date/date',
    'notizen_mitarbeiter': 'string/textarea',
  },
  'leistungskatalog': {
    'leistungsbezeichnung': 'string/text',
    'leistungsbeschreibung': 'string/textarea',
    'einheit': 'lookup/select',
    'standardpreis': 'number',
    'steuersatz_leistung': 'lookup/select',
    'aktiv': 'bool',
  },
  'rechnungsverwaltung': {
    'rechnungsnummer': 'string/text',
    'rechnungsdatum': 'date/date',
    'faelligkeitsdatum': 'date/date',
    'rechnungsstatus': 'lookup/select',
    'kunde_ref': 'applookup/select',
    'mitarbeiter_ref': 'applookup/select',
    'leistungen_ref': 'applookup/select',
    'menge': 'number',
    'nettobetrag': 'number',
    'steuersatz_rechnung': 'lookup/select',
    'bruttobetrag': 'number',
    'zahlungsdatum': 'date/date',
    'zahlungsart': 'lookup/select',
    'rechnungsdokument': 'file',
    'notizen_rechnung': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKundenverwaltung = StripLookup<Kundenverwaltung['fields']>;
export type CreateMitarbeiterverwaltung = StripLookup<Mitarbeiterverwaltung['fields']>;
export type CreateLeistungskatalog = StripLookup<Leistungskatalog['fields']>;
export type CreateRechnungsverwaltung = StripLookup<Rechnungsverwaltung['fields']>;