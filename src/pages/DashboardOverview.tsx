import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichRechnungsverwaltung } from '@/lib/enrich';
import type { EnrichedRechnungsverwaltung } from '@/types/enriched';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RechnungsverwaltungDialog } from '@/components/dialogs/RechnungsverwaltungDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash,
  IconCurrencyEuro, IconAlertTriangle, IconCircleCheck, IconClockHour4,
  IconChevronRight, IconReceipt, IconCash,
} from '@tabler/icons-react';

const APPGROUP_ID = '69cca6a4b41b7890bd466afe';
const REPAIR_ENDPOINT = '/claude/build/repair';

const KANBAN_COLUMNS: { key: string; label: string; dotColor: string; headerBg: string }[] = [
  { key: 'entwurf', label: 'Entwurf', dotColor: 'bg-slate-400', headerBg: 'bg-slate-50 border-slate-200' },
  { key: 'versendet', label: 'Versendet', dotColor: 'bg-blue-500', headerBg: 'bg-blue-50 border-blue-200' },
  { key: 'ueberfaellig', label: 'Überfällig', dotColor: 'bg-red-500', headerBg: 'bg-red-50 border-red-200' },
  { key: 'bezahlt', label: 'Bezahlt', dotColor: 'bg-green-500', headerBg: 'bg-green-50 border-green-200' },
  { key: 'storniert', label: 'Storniert', dotColor: 'bg-gray-400', headerBg: 'bg-gray-50 border-gray-200' },
];

const STATUS_LABELS: Record<string, string> = {
  entwurf: 'Entwurf',
  versendet: 'Versendet',
  bezahlt: 'Bezahlt',
  ueberfaellig: 'Überfällig',
  storniert: 'Storniert',
};

export default function DashboardOverview() {
  const {
    kundenverwaltung, mitarbeiterverwaltung, leistungskatalog, rechnungsverwaltung,
    kundenverwaltungMap, mitarbeiterverwaltungMap, leistungskatalogMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedRechnungen = enrichRechnungsverwaltung(rechnungsverwaltung, {
    kundenverwaltungMap, mitarbeiterverwaltungMap, leistungskatalogMap,
  });

  // ALL hooks BEFORE early returns
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedRechnungsverwaltung | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedRechnungsverwaltung | null>(null);
  const [createStatusKey, setCreateStatusKey] = useState<string | undefined>(undefined);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // Computed stats
  const totalBrutto = enrichedRechnungen.reduce((s, r) => s + (r.fields.bruttobetrag ?? 0), 0);
  const offenBrutto = enrichedRechnungen
    .filter(r => r.fields.rechnungsstatus?.key === 'versendet')
    .reduce((s, r) => s + (r.fields.bruttobetrag ?? 0), 0);
  const ueberfaelligCount = enrichedRechnungen.filter(
    r => r.fields.rechnungsstatus?.key === 'ueberfaellig',
  ).length;
  const bezahltBrutto = enrichedRechnungen
    .filter(r => r.fields.rechnungsstatus?.key === 'bezahlt')
    .reduce((s, r) => s + (r.fields.bruttobetrag ?? 0), 0);
  const bezahltCount = enrichedRechnungen.filter(r => r.fields.rechnungsstatus?.key === 'bezahlt').length;

  const columnData = KANBAN_COLUMNS.map(col => ({
    ...col,
    items: enrichedRechnungen.filter(
      r => (r.fields.rechnungsstatus?.key ?? 'entwurf') === col.key,
    ),
  }));

  const getKundeName = (r: EnrichedRechnungsverwaltung): string => {
    if (!r.fields.kunde_ref) return '—';
    const id = extractRecordId(r.fields.kunde_ref);
    if (!id) return '—';
    const k = kundenverwaltungMap.get(id);
    return k?.fields.firmenname || k?.fields.kundennummer || '—';
  };

  const handleEdit = (r: EnrichedRechnungsverwaltung) => {
    setEditRecord(r);
    setCreateStatusKey(undefined);
    setDialogOpen(true);
  };

  const handleCreateInColumn = (colKey: string) => {
    setEditRecord(null);
    setCreateStatusKey(colKey);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteRechnungsverwaltungEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  const getDefaultValues = (): Record<string, unknown> | undefined => {
    if (editRecord) return editRecord.fields as Record<string, unknown>;
    if (createStatusKey) {
      return {
        rechnungsstatus: {
          key: createStatusKey,
          label: STATUS_LABELS[createStatusKey] ?? createStatusKey,
        },
      };
    }
    return undefined;
  };

  return (
    <div className="space-y-6">
      {/* Workflow Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="#/intents/rechnung-erstellen"
          className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <IconReceipt size={20} className="text-primary" stroke={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Neue Rechnung erstellen</p>
            <p className="text-xs text-muted-foreground truncate">Kunde, Leistung und Mitarbeiter in einem Workflow verknüpfen</p>
          </div>
          <IconChevronRight size={16} className="text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" stroke={2} />
        </a>
        <a
          href="#/intents/zahlung-erfassen"
          className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-green-500 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <IconCash size={20} className="text-green-600" stroke={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Zahlungseingang erfassen</p>
            <p className="text-xs text-muted-foreground truncate">Offene oder überfällige Rechnung als bezahlt markieren</p>
          </div>
          <IconChevronRight size={16} className="text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" stroke={2} />
        </a>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamtumsatz"
          value={formatCurrency(totalBrutto)}
          description={`${enrichedRechnungen.length} Rechnungen gesamt`}
          icon={<IconCurrencyEuro size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Offen"
          value={formatCurrency(offenBrutto)}
          description="Versendet, unbezahlt"
          icon={<IconClockHour4 size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Überfällig"
          value={String(ueberfaelligCount)}
          description={ueberfaelligCount === 1 ? 'Rechnung überfällig' : 'Rechnungen überfällig'}
          icon={<IconAlertTriangle size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Bezahlt"
          value={formatCurrency(bezahltBrutto)}
          description={`${bezahltCount} ${bezahltCount === 1 ? 'Rechnung bezahlt' : 'Rechnungen bezahlt'}`}
          icon={<IconCircleCheck size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Board header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Rechnungsboard</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditRecord(null);
            setCreateStatusKey(undefined);
            setDialogOpen(true);
          }}
        >
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          <span>Neue Rechnung</span>
        </Button>
      </div>

      {/* Kanban Board — horizontal scroll on small screens */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-4">
        <div className="flex gap-3" style={{ minWidth: '780px' }}>
          {columnData.map(col => (
            <div key={col.key} className="flex-1 min-w-0 flex flex-col">
              {/* Column header */}
              <div className={`flex items-center justify-between rounded-xl border px-3 py-2 mb-2 ${col.headerBg}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.dotColor}`} />
                  <span className="text-sm font-semibold truncate">{col.label}</span>
                  <span className="text-xs text-muted-foreground bg-white/70 rounded-full px-1.5 py-0.5 shrink-0 font-medium">
                    {col.items.length}
                  </span>
                </div>
                <button
                  onClick={() => handleCreateInColumn(col.key)}
                  className="p-1 rounded-lg hover:bg-white/60 transition-colors text-muted-foreground shrink-0 ml-1"
                  title={`${col.label}-Rechnung erstellen`}
                >
                  <IconPlus size={14} />
                </button>
              </div>

              {/* Cards */}
              <div className="space-y-2 flex-1">
                {col.items.length === 0 ? (
                  <div className="flex items-center justify-center h-20 rounded-xl border border-dashed border-border/60">
                    <span className="text-xs text-muted-foreground/60">Keine Einträge</span>
                  </div>
                ) : (
                  col.items.map(r => (
                    <div
                      key={r.record_id}
                      className="bg-card rounded-xl border border-border p-3 hover:shadow-md transition-all duration-150 overflow-hidden"
                    >
                      {/* Nr + Betrag */}
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground truncate min-w-0 mt-0.5">
                          {r.fields.rechnungsnummer || 'Ohne Nr.'}
                        </span>
                        <span className="text-sm font-bold text-foreground shrink-0 leading-tight">
                          {r.fields.bruttobetrag != null
                            ? formatCurrency(r.fields.bruttobetrag)
                            : '—'}
                        </span>
                      </div>

                      {/* Kunde */}
                      <p className="text-sm font-medium text-foreground truncate leading-tight">
                        {getKundeName(r)}
                      </p>

                      {/* Leistung */}
                      {r.leistungen_refName ? (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {r.leistungen_refName}
                        </p>
                      ) : null}

                      {/* Fälligkeitsdatum + Aktionen */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 gap-1">
                        <span className="text-[10px] text-muted-foreground truncate min-w-0">
                          {r.fields.faelligkeitsdatum
                            ? `Fällig ${formatDate(r.fields.faelligkeitsdatum)}`
                            : 'Kein Datum'}
                        </span>
                        <div className="flex items-center shrink-0">
                          <button
                            onClick={() => handleEdit(r)}
                            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                            title="Bearbeiten"
                          >
                            <IconPencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                            title="Löschen"
                          >
                            <IconTrash size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <RechnungsverwaltungDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={async (fields) => {
          if (editRecord) {
            await LivingAppsService.updateRechnungsverwaltungEntry(editRecord.record_id, fields);
          } else {
            await LivingAppsService.createRechnungsverwaltungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={getDefaultValues()}
        kundenverwaltungList={kundenverwaltung}
        mitarbeiterverwaltungList={mitarbeiterverwaltung}
        leistungskatalogList={leistungskatalog}
        enablePhotoScan={AI_PHOTO_SCAN['Rechnungsverwaltung']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Rechnung löschen"
        description={`Rechnung "${deleteTarget?.fields.rechnungsnummer ?? ''}" wirklich unwiderruflich löschen?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
