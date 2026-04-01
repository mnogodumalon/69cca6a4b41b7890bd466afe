import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Kundenverwaltung, Rechnungsverwaltung } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  IconReceipt,
  IconCheck,
  IconAlertTriangle,
  IconArrowRight,
  IconArrowLeft,
  IconLoader2,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Rechnung wählen' },
  { label: 'Zahlungsdetails' },
  { label: 'Bestätigung' },
];

const ZAHLUNGSART_OPTIONS = [
  { key: 'ueberweisung', label: 'Überweisung' },
  { key: 'lastschrift', label: 'Lastschrift' },
  { key: 'kreditkarte', label: 'Kreditkarte' },
  { key: 'bar', label: 'Bar' },
  { key: 'paypal', label: 'PayPal' },
];

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ZahlungErfassenPage() {
  const [searchParams] = useSearchParams();

  // Data state — ALL hooks before any early returns
  const [rechnungen, setRechnungen] = useState<Rechnungsverwaltung[]>([]);
  const [kundenverwaltung, setKundenverwaltung] = useState<Kundenverwaltung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'alle' | 'versendet' | 'ueberfaellig'>('alle');
  const [selectedRechnung, setSelectedRechnung] = useState<Rechnungsverwaltung | null>(null);

  // Payment form state
  const [zahlungsdatum, setZahlungsdatum] = useState(getTodayISO());
  const [zahlungsart, setZahlungsart] = useState('ueberweisung');
  const [notizen, setNotizen] = useState('');

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Read URL params
  const rechnungIdParam = searchParams.get('rechnungId');
  const stepParam = parseInt(searchParams.get('step') ?? '', 10);

  // Load data
  useEffect(() => {
    Promise.all([
      LivingAppsService.getRechnungsverwaltung(),
      LivingAppsService.getKundenverwaltung(),
    ])
      .then(([r, k]) => {
        setRechnungen(r);
        setKundenverwaltung(k);
        setLoading(false);
      })
      .catch(e => {
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });
  }, []);

  // Initialize step from URL param
  useEffect(() => {
    if (stepParam >= 1 && stepParam <= 3) {
      setCurrentStep(stepParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-select invoice from URL param after data loads
  useEffect(() => {
    if (rechnungIdParam && rechnungen.length > 0) {
      const r = rechnungen.find(x => x.record_id === rechnungIdParam);
      if (r) {
        setSelectedRechnung(r);
        setCurrentStep(2);
      }
    }
  }, [rechnungen, rechnungIdParam]);

  // Build customer lookup map
  const kundeMap = useMemo(() => {
    const m = new Map<string, Kundenverwaltung>();
    kundenverwaltung.forEach(k => m.set(k.record_id, k));
    return m;
  }, [kundenverwaltung]);

  // Helpers
  const getKundeName = (r: Rechnungsverwaltung): string => {
    const id = extractRecordId(r.fields.kunde_ref);
    if (!id) return '—';
    const k = kundeMap.get(id);
    return k?.fields.firmenname || k?.fields.kundennummer || '—';
  };

  // Filter invoices
  const offeneRechnungen = useMemo(
    () =>
      rechnungen.filter(
        r =>
          r.fields.rechnungsstatus?.key === 'versendet' ||
          r.fields.rechnungsstatus?.key === 'ueberfaellig'
      ),
    [rechnungen]
  );

  const versendetRechnungen = useMemo(
    () => offeneRechnungen.filter(r => r.fields.rechnungsstatus?.key === 'versendet'),
    [offeneRechnungen]
  );

  const ueberfaelligRechnungen = useMemo(
    () => offeneRechnungen.filter(r => r.fields.rechnungsstatus?.key === 'ueberfaellig'),
    [offeneRechnungen]
  );

  const tabRechnungen = useMemo(() => {
    if (activeTab === 'versendet') return versendetRechnungen;
    if (activeTab === 'ueberfaellig') return ueberfaelligRechnungen;
    return offeneRechnungen;
  }, [activeTab, offeneRechnungen, versendetRechnungen, ueberfaelligRechnungen]);

  // Map invoices to EntitySelectStep items
  const toSelectItem = (r: Rechnungsverwaltung) => {
    const kundeName = getKundeName(r);
    const betrag = r.fields.bruttobetrag != null ? formatCurrency(r.fields.bruttobetrag) : null;
    const subtitleParts = [kundeName, betrag].filter(Boolean);
    return {
      id: r.record_id,
      title: r.fields.rechnungsnummer ?? '—',
      subtitle: subtitleParts.join(' • '),
      status: r.fields.faelligkeitsdatum
        ? { key: r.fields.rechnungsstatus?.key ?? '', label: 'Fällig: ' + formatDate(r.fields.faelligkeitsdatum) }
        : undefined,
      icon:
        r.fields.rechnungsstatus?.key === 'ueberfaellig' ? (
          <IconAlertTriangle size={18} className="text-orange-500" stroke={2} />
        ) : (
          <IconReceipt size={18} className="text-primary" stroke={2} />
        ),
    };
  };

  // Handle invoice selection
  const handleSelectRechnung = (id: string) => {
    const r = rechnungen.find(x => x.record_id === id);
    if (r) {
      setSelectedRechnung(r);
      setCurrentStep(2);
    }
  };

  // Handle payment submission
  const handleSubmit = async () => {
    if (!selectedRechnung) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.updateRechnungsverwaltungEntry(selectedRechnung.record_id, {
        rechnungsstatus: 'bezahlt',
        zahlungsdatum: zahlungsdatum,
        zahlungsart: zahlungsart,
        notizen_rechnung: notizen || undefined,
      });
      setSuccess(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset wizard
  const handleReset = () => {
    setSelectedRechnung(null);
    setZahlungsdatum(getTodayISO());
    setZahlungsart('ueberweisung');
    setNotizen('');
    setSuccess(false);
    setSubmitError(null);
    setCurrentStep(1);
    setActiveTab('alle');
  };

  const zahlungsartLabel = ZAHLUNGSART_OPTIONS.find(o => o.key === zahlungsart)?.label ?? zahlungsart;

  return (
    <IntentWizardShell
      title="Zahlung erfassen"
      subtitle="Zahlungseingang für eine offene Rechnung erfassen und als bezahlt markieren"
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
    >
      {/* ── Step 1: Offene Rechnung wählen ─────────────────────────────── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          {/* Summary count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconReceipt size={16} className="shrink-0" />
            <span>
              <span className="font-medium text-foreground">{offeneRechnungen.length}</span>{' '}
              Rechnung{offeneRechnungen.length !== 1 ? 'en' : ''} offen,{' '}
              {ueberfaelligRechnungen.length > 0 ? (
                <span className="font-medium text-orange-600">
                  {ueberfaelligRechnungen.length} überfällig
                </span>
              ) : (
                <span>{ueberfaelligRechnungen.length} überfällig</span>
              )}
            </span>
          </div>

          {/* Filter tabs */}
          {offeneRechnungen.length > 0 && (
            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit flex-wrap">
              <button
                onClick={() => setActiveTab('alle')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'alle'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Alle ({offeneRechnungen.length})
              </button>
              <button
                onClick={() => setActiveTab('versendet')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'versendet'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Versendet ({versendetRechnungen.length})
              </button>
              <button
                onClick={() => setActiveTab('ueberfaellig')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors gap-1 inline-flex items-center ${
                  activeTab === 'ueberfaellig'
                    ? 'bg-background shadow-sm text-orange-600'
                    : 'text-muted-foreground hover:text-orange-600'
                }`}
              >
                {ueberfaelligRechnungen.length > 0 && (
                  <IconAlertTriangle size={13} stroke={2} />
                )}
                Überfällig ({ueberfaelligRechnungen.length})
              </button>
            </div>
          )}

          {/* Invoice list or empty state */}
          {offeneRechnungen.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto">
                <IconCheck size={26} className="text-green-600" stroke={2.5} />
              </div>
              <div>
                <p className="font-semibold text-foreground">Alle Rechnungen sind beglichen</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Es gibt aktuell keine offenen oder überfälligen Rechnungen.
                </p>
              </div>
            </div>
          ) : (
            <EntitySelectStep
              items={tabRechnungen.map(toSelectItem)}
              onSelect={handleSelectRechnung}
              searchPlaceholder="Rechnungsnummer oder Kunde suchen..."
              emptyText="Keine Rechnungen in dieser Kategorie."
              emptyIcon={<IconReceipt size={32} />}
            />
          )}
        </div>
      )}

      {/* ── Step 2: Zahlungsdetails ─────────────────────────────────────── */}
      {currentStep === 2 && selectedRechnung && (
        <div className="space-y-6">
          {/* Invoice summary card */}
          <div className="rounded-xl border bg-card p-5 space-y-3 overflow-hidden">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Rechnung</p>
                <p className="text-lg font-bold truncate">
                  {selectedRechnung.fields.rechnungsnummer ?? '—'}
                </p>
              </div>
              <StatusBadge
                statusKey={selectedRechnung.fields.rechnungsstatus?.key}
                label={selectedRechnung.fields.rechnungsstatus?.label}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <p className="text-xs text-muted-foreground">Kunde</p>
                <p className="text-sm font-medium truncate">{getKundeName(selectedRechnung)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Betrag (brutto)</p>
                <p className="text-sm font-medium">
                  {selectedRechnung.fields.bruttobetrag != null
                    ? formatCurrency(selectedRechnung.fields.bruttobetrag)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fälligkeitsdatum</p>
                <p className={`text-sm font-medium ${
                  selectedRechnung.fields.rechnungsstatus?.key === 'ueberfaellig'
                    ? 'text-orange-600'
                    : ''
                }`}>
                  {selectedRechnung.fields.faelligkeitsdatum
                    ? formatDate(selectedRechnung.fields.faelligkeitsdatum)
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Payment form */}
          <div className="rounded-xl border bg-card p-5 space-y-5 overflow-hidden">
            <h2 className="font-semibold text-foreground">Zahlungsdetails eingeben</h2>

            <div className="space-y-4">
              {/* Zahlungseingangsdatum */}
              <div className="space-y-1.5">
                <Label htmlFor="zahlungsdatum">
                  Zahlungseingangsdatum <span className="text-destructive">*</span>
                </Label>
                <input
                  id="zahlungsdatum"
                  type="date"
                  value={zahlungsdatum}
                  onChange={e => setZahlungsdatum(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                />
              </div>

              {/* Zahlungsart */}
              <div className="space-y-1.5">
                <Label htmlFor="zahlungsart">
                  Zahlungsart <span className="text-destructive">*</span>
                </Label>
                <select
                  id="zahlungsart"
                  value={zahlungsart}
                  onChange={e => setZahlungsart(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {ZAHLUNGSART_OPTIONS.map(o => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notizen */}
              <div className="space-y-1.5">
                <Label htmlFor="notizen">Notizen zur Zahlung</Label>
                <Textarea
                  id="notizen"
                  placeholder="Optionale Anmerkungen zur Zahlung..."
                  value={notizen}
                  onChange={e => setNotizen(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Live confirmation hint */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm text-muted-foreground">
              <IconArrowRight size={15} className="text-primary shrink-0" stroke={2} />
              <span>
                Mit diesen Angaben wird Rechnung{' '}
                <span className="font-medium text-foreground">
                  {selectedRechnung.fields.rechnungsnummer ?? '—'}
                </span>{' '}
                als bezahlt markiert.
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-2">
              <IconArrowLeft size={16} stroke={2} />
              Zurück
            </Button>
            <Button
              onClick={() => setCurrentStep(3)}
              disabled={!zahlungsdatum || !zahlungsart}
              className="gap-2"
            >
              Weiter
              <IconArrowRight size={16} stroke={2} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Bestätigung ─────────────────────────────────────────── */}
      {currentStep === 3 && selectedRechnung && (
        <div className="space-y-6">
          {success ? (
            /* Success state */
            <div className="space-y-6">
              <div className="flex flex-col items-center py-10 gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <IconCheck size={32} className="text-green-600" stroke={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Zahlung erfasst!</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Rechnung{' '}
                    <span className="font-medium text-foreground">
                      {selectedRechnung.fields.rechnungsnummer ?? '—'}
                    </span>{' '}
                    über{' '}
                    <span className="font-medium text-foreground">
                      {selectedRechnung.fields.bruttobetrag != null
                        ? formatCurrency(selectedRechnung.fields.bruttobetrag)
                        : '—'}
                    </span>{' '}
                    am{' '}
                    <span className="font-medium text-foreground">
                      {formatDate(zahlungsdatum)}
                    </span>{' '}
                    als bezahlt erfasst.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={handleReset} variant="outline" className="gap-2 w-full sm:w-auto">
                  <IconReceipt size={16} stroke={2} />
                  Weitere Zahlung erfassen
                </Button>
                <a href="#/rechnungsverwaltung" className="w-full sm:w-auto">
                  <Button className="gap-2 w-full">
                    Zu den Rechnungen
                    <IconArrowRight size={16} stroke={2} />
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            /* Confirm state */
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Invoice details card */}
                <div className="rounded-xl border bg-card p-5 space-y-3 overflow-hidden">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <IconReceipt size={16} className="text-muted-foreground" stroke={2} />
                    Rechnungsdetails
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2 flex-wrap">
                      <dt className="text-muted-foreground">Rechnungsnummer</dt>
                      <dd className="font-medium text-right">
                        {selectedRechnung.fields.rechnungsnummer ?? '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 flex-wrap">
                      <dt className="text-muted-foreground">Kunde</dt>
                      <dd className="font-medium text-right truncate max-w-[60%]">
                        {getKundeName(selectedRechnung)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 flex-wrap">
                      <dt className="text-muted-foreground">Rechnungsdatum</dt>
                      <dd className="font-medium text-right">
                        {selectedRechnung.fields.rechnungsdatum
                          ? formatDate(selectedRechnung.fields.rechnungsdatum)
                          : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 flex-wrap">
                      <dt className="text-muted-foreground">Nettobetrag</dt>
                      <dd className="font-medium text-right">
                        {selectedRechnung.fields.nettobetrag != null
                          ? formatCurrency(selectedRechnung.fields.nettobetrag)
                          : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 flex-wrap border-t pt-2">
                      <dt className="text-muted-foreground font-medium">Bruttobetrag</dt>
                      <dd className="font-bold text-right text-foreground">
                        {selectedRechnung.fields.bruttobetrag != null
                          ? formatCurrency(selectedRechnung.fields.bruttobetrag)
                          : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Payment details card */}
                <div className="rounded-xl border bg-card p-5 space-y-3 overflow-hidden">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <IconCheck size={16} className="text-muted-foreground" stroke={2} />
                    Zahlungsdetails
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2 flex-wrap">
                      <dt className="text-muted-foreground">Zahlungseingangsdatum</dt>
                      <dd className="font-medium text-right">{formatDate(zahlungsdatum)}</dd>
                    </div>
                    <div className="flex justify-between gap-2 flex-wrap">
                      <dt className="text-muted-foreground">Zahlungsart</dt>
                      <dd className="font-medium text-right">{zahlungsartLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-2 flex-wrap">
                      <dt className="text-muted-foreground">Neuer Status</dt>
                      <dd className="text-right">
                        <StatusBadge statusKey="bezahlt" label="Bezahlt" />
                      </dd>
                    </div>
                    {notizen && (
                      <div className="pt-2 border-t">
                        <dt className="text-muted-foreground mb-1">Notizen</dt>
                        <dd className="text-foreground text-xs leading-relaxed">{notizen}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {/* Error message */}
              {submitError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <IconAlertTriangle size={16} className="shrink-0 mt-0.5" stroke={2} />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  disabled={submitting}
                  className="gap-2"
                >
                  <IconArrowLeft size={16} stroke={2} />
                  Zurück
                </Button>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="gap-2 min-w-[180px]"
                >
                  {submitting ? (
                    <>
                      <IconLoader2 size={18} className="animate-spin" stroke={2} />
                      Wird gespeichert...
                    </>
                  ) : (
                    <>
                      <IconCheck size={18} stroke={2.5} />
                      Zahlung erfassen
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </IntentWizardShell>
  );
}
