import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import RechnungsverwaltungPage from '@/pages/RechnungsverwaltungPage';
import LeistungskatalogPage from '@/pages/LeistungskatalogPage';
import MitarbeiterverwaltungPage from '@/pages/MitarbeiterverwaltungPage';
import KundenverwaltungPage from '@/pages/KundenverwaltungPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="rechnungsverwaltung" element={<RechnungsverwaltungPage />} />
              <Route path="leistungskatalog" element={<LeistungskatalogPage />} />
              <Route path="mitarbeiterverwaltung" element={<MitarbeiterverwaltungPage />} />
              <Route path="kundenverwaltung" element={<KundenverwaltungPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
