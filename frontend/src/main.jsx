import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PdfPage from './pages/PdfPage';
import ShopsPage from './pages/ShopsPage';
import AccountsPage from './pages/AccountsPage';
import ProductsPage from './pages/ProductsPage';
import AdPage from './pages/AdPage';
import PurchasePage from './pages/PurchasePage';
import StockPage from './pages/StockPage';
import ShipmentPage from './pages/ShipmentPage';
import SettingsPage from './pages/SettingsPage';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pdf" element={<PdfPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/ad" element={<AdPage />} />
            <Route path="/purchase" element={<PurchasePage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/shipment" element={<ShipmentPage />} />
            <Route path="/shops" element={<ShopsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              background: '#1d1d1f',
              color: '#fff',
              fontSize: '14px',
              padding: '10px 16px',
            },
          }}
        />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
);
