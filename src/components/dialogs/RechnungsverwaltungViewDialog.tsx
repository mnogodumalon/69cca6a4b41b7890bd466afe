import type { Rechnungsverwaltung, Kundenverwaltung, Mitarbeiterverwaltung, Leistungskatalog } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface RechnungsverwaltungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Rechnungsverwaltung | null;
  onEdit: (record: Rechnungsverwaltung) => void;
  kundenverwaltungList: Kundenverwaltung[];
  mitarbeiterverwaltungList: Mitarbeiterverwaltung[];
  leistungskatalogList: Leistungskatalog[];
}

export function RechnungsverwaltungViewDialog({ open, onClose, record, onEdit, kundenverwaltungList, mitarbeiterverwaltungList, leistungskatalogList }: RechnungsverwaltungViewDialogProps) {
  function getKundenverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kundenverwaltungList.find(r => r.record_id === id)?.fields.kundennummer ?? '—';
  }

  function getMitarbeiterverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return mitarbeiterverwaltungList.find(r => r.record_id === id)?.fields.mitarbeiter_vorname ?? '—';
  }

  function getLeistungskatalogDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return leistungskatalogList.find(r => r.record_id === id)?.fields.leistungsbezeichnung ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rechnungsverwaltung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rechnungsnummer</Label>
            <p className="text-sm">{record.fields.rechnungsnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rechnungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.rechnungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fälligkeitsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.faelligkeitsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rechnungsstatus</Label>
            <Badge variant="secondary">{record.fields.rechnungsstatus?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kunde</Label>
            <p className="text-sm">{getKundenverwaltungDisplayName(record.fields.kunde_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zuständiger Mitarbeitender</Label>
            <p className="text-sm">{getMitarbeiterverwaltungDisplayName(record.fields.mitarbeiter_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Leistung</Label>
            <p className="text-sm">{getLeistungskatalogDisplayName(record.fields.leistungen_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Menge / Stunden</Label>
            <p className="text-sm">{record.fields.menge ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nettobetrag (€)</Label>
            <p className="text-sm">{record.fields.nettobetrag ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Steuersatz</Label>
            <Badge variant="secondary">{record.fields.steuersatz_rechnung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bruttobetrag (€)</Label>
            <p className="text-sm">{record.fields.bruttobetrag ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zahlungseingangsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.zahlungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zahlungsart</Label>
            <Badge variant="secondary">{record.fields.zahlungsart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rechnungsdokument (PDF)</Label>
            {record.fields.rechnungsdokument ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.rechnungsdokument} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen_rechnung ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}