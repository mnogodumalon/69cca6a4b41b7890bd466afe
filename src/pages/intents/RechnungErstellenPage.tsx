import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { KundenverwaltungDialog } from '@/components/dialogs/KundenverwaltungDialog';
import { MitarbeiterverwaltungDialog } from '@/components/dialogs/MitarbeiterverwaltungDialog';
import { LeistungskatalogDialog } from '@/components/dialogs/LeistungskatalogDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Kundenverwaltung, Mitarbeiterverwaltung, Leistungskatalog } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  IconBuildingStore,
  IconCheck,
  IconArrowLeft,
  IconArrowRight,
  IconCurrencyEuro,
  IconReceipt,
  IconUser,
  IconPlus,
  IconReload,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Kunde' },
  { label: 'Leistung' },
  { label: 'Mitarbeiter' },
  { label: 'Details' },
  { label: 'Zusammenfassung' },
];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function generateRechnungsnummer(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `RE-${y}${m}${d}-001`;
}

export default function RechnungErstellenPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Data state ---
  const [kundenverwaltung, setKundenverwaltung] = useState<Kundenverwaltung[]>([]);
  const [mitarbeiterverwaltung, setMitarbeiterverwaltung] = useState<Mitarbeiterverwaltung[]>([]);
  const [leistungskatalog, setLeistungskatalog] = useState<Leistungskatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // --- Wizard step ---
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    return urlStep >= 1 && urlStep <= 5 ? urlStep : 1;
  });

  // --- Selections ---
  const [selectedKunde, setSelectedKunde] = useState<Kundenverwaltung | null>(null);
  const [selectedLeistung, setSelectedLeistung] = useState<Leistungskatalog | null>(null);
  const [selectedMitarbeiter, setSelectedMitarbeiter] = useState<Mitarbeiterverwaltung | null>(null);
  const [menge, setMenge] = useState<number>(1);

  // --- Invoice details ---
  const [rechnungsnummer, setRechnungsnummer] = useState(generateRechnungsnummer());
  const [rechnungsdatum, setRechnungsdatum] = useState(todayStr());
  const [faelligkeitsdatum, setFaelligkeitsdatum] = useState(addDays(todayStr(), 30));
  const [rechnungsstatus, setRechnungsstatus] = useState('entwurf');
  const [notizen, setNotizen] = useState('');

  // --- Dialog states ---
  const [kundeDialogOpen, setKundeDialogOpen] = useState(false);
  const [leistungDialogOpen, setLeistungDialogOpen] = useState(false);
  const [mitarbeiterDialogOpen, setMitarbeiterDialogOpen] = useState(false);

  // --- Submit state ---
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdRechnungsnummer, setCreatedRechnungsnummer] = useState<string | null>(null);

  // --- Fetch data ---
  const fetchAll = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      LivingAppsService.getKundenverwaltung(),
      LivingAppsService.getMitarbeiterverwaltung(),
      LivingAppsService.getLeistungskatalog(),
    ])
      .then(([k, m, l]) => {
        setKundenverwaltung(k);
        setMitarbeiterverwaltung(m);
        setLeistungskatalog(l);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAll();

    // Pre-select customer from URL param
    const kundeId = searchParams.get('kundeId');
    if (kundeId) {
      // We'll set this after data loads below
      sessionStorage.setItem('_rechnungKundeId', kundeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After data loads, apply kundeId pre-selection
  useEffect(() => {
    if (!loading && kundenverwaltung.length > 0) {
      const storedId = sessionStorage.getItem('_rechnungKundeId');
      if (storedId) {
        const found = kundenverwaltung.find(k => k.record_id === storedId);
        if (found) {
          setSelectedKunde(found);
          handleStepChange(2);
        }
        sessionStorage.removeItem('_rechnungKundeId');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, kundenverwaltung]);

  // Sync step to URL
  const handleStepChange = (step: number) => {
    setCurrentStep(step);
    const params = new URLSearchParams(searchParams);
    params.set('step', String(step));
    setSearchParams(params, { replace: true });
  };

  // --- Computed amounts ---
  const steuersatzKey = selectedLeistung?.fields.steuersatz_leistung?.key ?? 'steuersatz_19';
  const steuerRate =
    steuersatzKey === 'steuersatz_19' ? 0.19 : steuersatzKey === 'steuersatz_7' ? 0.07 : 0;
  const standardpreis = selectedLeistung?.fields.standardpreis ?? 0;
  const nettobetrag = standardpreis * menge;
  const steuerbetrag = nettobetrag * steuerRate;
  const bruttobetrag = nettobetrag + steuerbetrag;

  // --- Sorted leistungen (aktiv first) ---
  const sortedLeistungen = [...leistungskatalog].sort((a, b) => {
    const aAktiv = a.fields.aktiv ? 1 : 0;
    const bAktiv = b.fields.aktiv ? 1 : 0;
    return bAktiv - aAktiv;
  });

  // --- Submit ---
  const handleSubmit = async () => {
    if (!selectedKunde || !selectedLeistung || !selectedMitarbeiter) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createRechnungsverwaltungEntry({
        rechnungsnummer,
        rechnungsdatum,
        faelligkeitsdatum,
        rechnungsstatus,
        notizen_rechnung: notizen || undefined,
        kunde_ref: createRecordUrl(APP_IDS.KUNDENVERWALTUNG, selectedKunde.record_id),
        mitarbeiter_ref: createRecordUrl(APP_IDS.MITARBEITERVERWALTUNG, selectedMitarbeiter.record_id),
        leistungen_ref: createRecordUrl(APP_IDS.LEISTUNGSKATALOG, selectedLeistung.record_id),
        menge,
        nettobetrag,
        bruttobetrag,
        steuersatz_rechnung: steuersatzKey,
      });
      setCreatedRechnungsnummer(rechnungsnummer);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Reset wizard ---
  const resetWizard = () => {
    setSelectedKunde(null);
    setSelectedLeistung(null);
    setSelectedMitarbeiter(null);
    setMenge(1);
    setRechnungsnummer(generateRechnungsnummer());
    setRechnungsdatum(todayStr());
    setFaelligkeitsdatum(addDays(todayStr(), 30));
    setRechnungsstatus('entwurf');
    setNotizen('');
    setCreatedRechnungsnummer(null);
    setSubmitError(null);
    handleStepChange(1);
  };

  // --- Mini Summary Sidebar (steps 2-5) ---
  const showSidebar = currentStep >= 2 && !createdRechnungsnummer;

  const SummarySidebar = () => (
    <div className="bg-muted/40 rounded-2xl border p-4 space-y-3 text-sm">
      <p className="font-semibold text-foreground text-xs uppercase tracking-wide text-muted-foreground">
        Zusammenfassung
      </p>

      {selectedKunde && (
        <div className="flex items-start gap-2">
          <IconBuildingStore size={15} className="text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{selectedKunde.fields.firmenname ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{selectedKunde.fields.kundennummer}</p>
          </div>
        </div>
      )}

      {selectedLeistung && (
        <div className="flex items-start gap-2">
          <IconReceipt size={15} className="text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{selectedLeistung.fields.leistungsbezeichnung ?? '—'}</p>
            <p className="text-xs text-muted-foreground">
              {menge} × {formatCurrency(selectedLeistung.fields.standardpreis)}{' '}
              {selectedLeistung.fields.einheit?.label ?? ''}
            </p>
          </div>
        </div>
      )}

      {selectedMitarbeiter && (
        <div className="flex items-start gap-2">
          <IconUser size={15} className="text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">
              {selectedMitarbeiter.fields.mitarbeiter_vorname ?? ''}{' '}
              {selectedMitarbeiter.fields.mitarbeiter_nachname ?? ''}
            </p>
            <p className="text-xs text-muted-foreground">{selectedMitarbeiter.fields.rolle}</p>
          </div>
        </div>
      )}

      {selectedLeistung && (
        <div className="border-t pt-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Netto</span>
            <span>{formatCurrency(nettobetrag)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              MwSt. ({selectedLeistung.fields.steuersatz_leistung?.label ?? '19%'})
            </span>
            <span>{formatCurrency(steuerbetrag)}</span>
          </div>
          <div className="flex justify-between font-semibold text-sm pt-1 border-t">
            <span>Brutto</span>
            <span className="text-primary">{formatCurrency(bruttobetrag)}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <IntentWizardShell
      title="Rechnung erstellen"
      subtitle="Erstelle eine neue Beratungsrechnung in wenigen Schritten."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* SUCCESS STATE */}
      {createdRechnungsnummer ? (
        <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <IconCheck size={32} className="text-green-600" stroke={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">Rechnung erstellt!</h2>
            <p className="text-muted-foreground text-sm">
              Rechnung <span className="font-semibold text-foreground">{createdRechnungsnummer}</span> wurde
              erfolgreich angelegt.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={resetWizard} variant="outline" className="gap-2">
              <IconPlus size={16} />
              Neue Rechnung erstellen
            </Button>
            <Button asChild>
              <a href="#/rechnungsverwaltung">
                <IconReceipt size={16} className="mr-2" />
                Zur Rechnungsübersicht
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <div className={showSidebar ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : ''}>
          {/* MAIN CONTENT */}
          <div className={showSidebar ? 'lg:col-span-2' : ''}>

            {/* STEP 1 — Kunde wählen */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Kunde wählen</h2>
                  <p className="text-sm text-muted-foreground">
                    Wähle den Kunden aus, für den du die Rechnung erstellen möchtest.
                  </p>
                </div>
                <EntitySelectStep
                  items={kundenverwaltung.map(k => ({
                    id: k.record_id,
                    title: k.fields.firmenname ?? '—',
                    subtitle: k.fields.kundennummer,
                    status: k.fields.ansprechpartner_email
                      ? { key: 'aktiv', label: k.fields.ansprechpartner_email }
                      : undefined,
                    icon: <IconBuildingStore size={18} className="text-primary" />,
                  }))}
                  onSelect={id => {
                    const k = kundenverwaltung.find(x => x.record_id === id);
                    setSelectedKunde(k ?? null);
                    handleStepChange(2);
                  }}
                  searchPlaceholder="Kunde suchen..."
                  emptyIcon={<IconBuildingStore size={32} />}
                  emptyText="Noch keine Kunden vorhanden."
                  createLabel="Neuen Kunden anlegen"
                  onCreateNew={() => setKundeDialogOpen(true)}
                  createDialog={
                    <KundenverwaltungDialog
                      open={kundeDialogOpen}
                      onClose={() => setKundeDialogOpen(false)}
                      onSubmit={async fields => {
                        await LivingAppsService.createKundenverwaltungEntry(fields);
                        const updated = await LivingAppsService.getKundenverwaltung();
                        setKundenverwaltung(updated);
                        setKundeDialogOpen(false);
                      }}
                      enablePhotoScan={false}
                      enablePhotoLocation={false}
                    />
                  }
                />
              </div>
            )}

            {/* STEP 2 — Leistung wählen */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Leistung wählen</h2>
                  <p className="text-sm text-muted-foreground">
                    Wähle die zu berechnende Leistung aus dem Katalog.
                  </p>
                </div>
                <EntitySelectStep
                  items={sortedLeistungen.map(l => ({
                    id: l.record_id,
                    title: l.fields.leistungsbezeichnung ?? '—',
                    subtitle: `${formatCurrency(l.fields.standardpreis)} / ${l.fields.einheit?.label ?? '—'}`,
                    status: l.fields.steuersatz_leistung
                      ? { key: l.fields.steuersatz_leistung.key, label: `MwSt. ${l.fields.steuersatz_leistung.label}` }
                      : undefined,
                    icon: <IconCurrencyEuro size={18} className="text-primary" />,
                  }))}
                  onSelect={id => {
                    const l = leistungskatalog.find(x => x.record_id === id);
                    setSelectedLeistung(l ?? null);
                  }}
                  searchPlaceholder="Leistung suchen..."
                  emptyIcon={<IconCurrencyEuro size={32} />}
                  emptyText="Noch keine Leistungen vorhanden."
                  createLabel="Neue Leistung anlegen"
                  onCreateNew={() => setLeistungDialogOpen(true)}
                  createDialog={
                    <LeistungskatalogDialog
                      open={leistungDialogOpen}
                      onClose={() => setLeistungDialogOpen(false)}
                      onSubmit={async fields => {
                        await LivingAppsService.createLeistungskatalogEntry(fields);
                        const updated = await LivingAppsService.getLeistungskatalog();
                        setLeistungskatalog(updated);
                        setLeistungDialogOpen(false);
                      }}
                      enablePhotoScan={false}
                      enablePhotoLocation={false}
                    />
                  }
                />

                {/* Menge + Live-Vorschau */}
                {selectedLeistung && (
                  <div className="border rounded-2xl p-4 space-y-4 bg-card">
                    <div className="space-y-1.5">
                      <Label htmlFor="menge">Menge</Label>
                      <Input
                        id="menge"
                        type="number"
                        min={1}
                        step={1}
                        value={menge}
                        onChange={e => setMenge(Math.max(1, Number(e.target.value)))}
                        className="w-40"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-muted/50 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Netto</p>
                        <p className="font-semibold text-sm">{formatCurrency(nettobetrag)}</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          MwSt. ({selectedLeistung.fields.steuersatz_leistung?.label ?? '19%'})
                        </p>
                        <p className="font-semibold text-sm">{formatCurrency(steuerbetrag)}</p>
                      </div>
                      <div className="bg-primary/10 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Brutto</p>
                        <p className="font-semibold text-sm text-primary">{formatCurrency(bruttobetrag)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => handleStepChange(1)} className="gap-2">
                    <IconArrowLeft size={16} />
                    Zurück
                  </Button>
                  <Button
                    onClick={() => handleStepChange(3)}
                    disabled={!selectedLeistung}
                    className="gap-2"
                  >
                    Weiter
                    <IconArrowRight size={16} />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3 — Mitarbeiter zuweisen */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Mitarbeiter zuweisen</h2>
                  <p className="text-sm text-muted-foreground">
                    Wähle den Mitarbeiter, der für diese Rechnung zuständig ist.
                  </p>
                </div>
                <EntitySelectStep
                  items={mitarbeiterverwaltung.map(m => ({
                    id: m.record_id,
                    title: `${m.fields.mitarbeiter_vorname ?? ''} ${m.fields.mitarbeiter_nachname ?? ''}`.trim() || '—',
                    subtitle: m.fields.rolle,
                    status: m.fields.stundensatz != null
                      ? { key: 'aktiv', label: `${m.fields.stundensatz} €/h` }
                      : undefined,
                    icon: <IconUser size={18} className="text-primary" />,
                  }))}
                  onSelect={id => {
                    const m = mitarbeiterverwaltung.find(x => x.record_id === id);
                    setSelectedMitarbeiter(m ?? null);
                    handleStepChange(4);
                  }}
                  searchPlaceholder="Mitarbeiter suchen..."
                  emptyIcon={<IconUser size={32} />}
                  emptyText="Noch keine Mitarbeiter vorhanden."
                  createLabel="Neuen Mitarbeiter anlegen"
                  onCreateNew={() => setMitarbeiterDialogOpen(true)}
                  createDialog={
                    <MitarbeiterverwaltungDialog
                      open={mitarbeiterDialogOpen}
                      onClose={() => setMitarbeiterDialogOpen(false)}
                      onSubmit={async fields => {
                        await LivingAppsService.createMitarbeiterverwaltungEntry(fields);
                        const updated = await LivingAppsService.getMitarbeiterverwaltung();
                        setMitarbeiterverwaltung(updated);
                        setMitarbeiterDialogOpen(false);
                      }}
                      enablePhotoScan={false}
                      enablePhotoLocation={false}
                    />
                  }
                />
                <div className="pt-2">
                  <Button variant="outline" onClick={() => handleStepChange(2)} className="gap-2">
                    <IconArrowLeft size={16} />
                    Zurück
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4 — Rechnungsdetails */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold">Rechnungsdetails</h2>
                  <p className="text-sm text-muted-foreground">
                    Gib die Details für die Rechnung ein.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="rechnungsnummer">
                      Rechnungsnummer <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="rechnungsnummer"
                      value={rechnungsnummer}
                      onChange={e => setRechnungsnummer(e.target.value)}
                      placeholder="z. B. RE-20260401-001"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rechnungsstatus">Status</Label>
                    <Select value={rechnungsstatus} onValueChange={setRechnungsstatus}>
                      <SelectTrigger id="rechnungsstatus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entwurf">Entwurf</SelectItem>
                        <SelectItem value="versendet">Versendet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rechnungsdatum">
                      Rechnungsdatum <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="rechnungsdatum"
                      type="date"
                      value={rechnungsdatum}
                      onChange={e => setRechnungsdatum(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="faelligkeitsdatum">
                      Fälligkeitsdatum <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="faelligkeitsdatum"
                      type="date"
                      value={faelligkeitsdatum}
                      onChange={e => setFaelligkeitsdatum(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notizen">Notizen (optional)</Label>
                  <Textarea
                    id="notizen"
                    value={notizen}
                    onChange={e => setNotizen(e.target.value)}
                    placeholder="Interne Notizen zur Rechnung..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => handleStepChange(3)} className="gap-2">
                    <IconArrowLeft size={16} />
                    Zurück
                  </Button>
                  <Button
                    onClick={() => handleStepChange(5)}
                    disabled={!rechnungsnummer.trim() || !rechnungsdatum || !faelligkeitsdatum}
                    className="gap-2"
                  >
                    Weiter
                    <IconArrowRight size={16} />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 5 — Zusammenfassung & Erstellen */}
            {currentStep === 5 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold">Zusammenfassung & Erstellen</h2>
                  <p className="text-sm text-muted-foreground">
                    Prüfe alle Angaben und erstelle die Rechnung.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Kunde */}
                  <div className="border rounded-2xl p-4 space-y-2 bg-card">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kunde</p>
                    <p className="font-semibold">{selectedKunde?.fields.firmenname ?? '—'}</p>
                    <p className="text-sm text-muted-foreground">{selectedKunde?.fields.kundennummer}</p>
                    {selectedKunde?.fields.ansprechpartner_email && (
                      <p className="text-sm text-muted-foreground">{selectedKunde.fields.ansprechpartner_email}</p>
                    )}
                  </div>

                  {/* Mitarbeiter */}
                  <div className="border rounded-2xl p-4 space-y-2 bg-card">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mitarbeiter</p>
                    <p className="font-semibold">
                      {selectedMitarbeiter?.fields.mitarbeiter_vorname ?? ''}{' '}
                      {selectedMitarbeiter?.fields.mitarbeiter_nachname ?? ''}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedMitarbeiter?.fields.rolle}</p>
                    {selectedMitarbeiter?.fields.stundensatz != null && (
                      <p className="text-sm text-muted-foreground">
                        {selectedMitarbeiter.fields.stundensatz} €/h
                      </p>
                    )}
                  </div>

                  {/* Leistung */}
                  <div className="border rounded-2xl p-4 space-y-2 bg-card">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Leistung</p>
                    <p className="font-semibold">{selectedLeistung?.fields.leistungsbezeichnung ?? '—'}</p>
                    <p className="text-sm text-muted-foreground">
                      {menge} × {formatCurrency(selectedLeistung?.fields.standardpreis)}{' '}
                      / {selectedLeistung?.fields.einheit?.label ?? '—'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      MwSt.: {selectedLeistung?.fields.steuersatz_leistung?.label ?? '—'}
                    </p>
                  </div>

                  {/* Rechnungsdetails */}
                  <div className="border rounded-2xl p-4 space-y-2 bg-card">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rechnungsdetails</p>
                    <p className="font-semibold">{rechnungsnummer}</p>
                    <p className="text-sm text-muted-foreground">
                      Datum: {formatDate(rechnungsdatum)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Fällig: {formatDate(faelligkeitsdatum)}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      Status: {rechnungsstatus === 'entwurf' ? 'Entwurf' : 'Versendet'}
                    </p>
                  </div>
                </div>

                {/* Betrag */}
                <div className="border rounded-2xl p-4 bg-card space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Beträge</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nettobetrag</span>
                    <span>{formatCurrency(nettobetrag)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      MwSt. ({selectedLeistung?.fields.steuersatz_leistung?.label ?? '19%'})
                    </span>
                    <span>{formatCurrency(steuerbetrag)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Bruttobetrag</span>
                    <span className="text-primary">{formatCurrency(bruttobetrag)}</span>
                  </div>
                </div>

                {notizen && (
                  <div className="border rounded-2xl p-4 bg-card">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notizen</p>
                    <p className="text-sm whitespace-pre-wrap">{notizen}</p>
                  </div>
                )}

                {submitError && (
                  <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
                    Fehler: {submitError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => handleStepChange(4)} className="gap-2">
                    <IconArrowLeft size={16} />
                    Zurück
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="gap-2 flex-1 sm:flex-none"
                  >
                    {submitting ? (
                      <>
                        <IconReload size={16} className="animate-spin" />
                        Wird erstellt...
                      </>
                    ) : (
                      <>
                        <IconCheck size={16} />
                        Rechnung erstellen
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR SUMMARY */}
          {showSidebar && (
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <SummarySidebar />
              </div>
            </div>
          )}
        </div>
      )}
    </IntentWizardShell>
  );
}
