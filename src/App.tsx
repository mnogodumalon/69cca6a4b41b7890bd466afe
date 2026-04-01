import { HashRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import KundenverwaltungPage from '@/pages/KundenverwaltungPage';
import MitarbeiterverwaltungPage from '@/pages/MitarbeiterverwaltungPage';
import LeistungskatalogPage from '@/pages/LeistungskatalogPage';
import RechnungsverwaltungPage from '@/pages/RechnungsverwaltungPage';

const RechnungErstellenPage = lazy(() => import('@/pages/intents/RechnungErstellenPage'));
const ZahlungErfassenPage = lazy(() => import('@/pages/intents/ZahlungErfassenPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="kundenverwaltung" element={<KundenverwaltungPage />} />
              <Route path="mitarbeiterverwaltung" element={<MitarbeiterverwaltungPage />} />
              <Route path="leistungskatalog" element={<LeistungskatalogPage />} />
              <Route path="rechnungsverwaltung" element={<RechnungsverwaltungPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="intents/rechnung-erstellen" element={<Suspense><RechnungErstellenPage /></Suspense>} />
              <Route path="intents/zahlung-erfassen" element={<Suspense><ZahlungErfassenPage /></Suspense>} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
