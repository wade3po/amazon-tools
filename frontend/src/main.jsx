import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PdfPage from './pages/PdfPage';
import PdfCleanPage from './pages/PdfCleanPage';
import ShopsPage from './pages/ShopsPage';
import AccountsPage from './pages/AccountsPage';
import ProductsPage from './pages/ProductsPage';
import AdPage from './pages/AdPage';
import PurchasePage from './pages/PurchasePage';
import StockPage from './pages/StockPage';
import ShipmentPage from './pages/ShipmentPage';
import SettingsPage from './pages/SettingsPage';

// SEO Tools pages - lazy loaded for code splitting
const ToolsLayout = lazy(() => import('./pages/tools/ToolsLayout'));
const ToolsHomePage = lazy(() => import('./pages/tools/ToolsHomePage'));
const SearchTermsCleaner = lazy(() => import('./pages/tools/SearchTermsCleaner'));
const TitleOptimizer = lazy(() => import('./pages/tools/TitleOptimizer'));
const FlatFileCleaner = lazy(() => import('./pages/tools/FlatFileCleaner'));
const ListingFormatter = lazy(() => import('./pages/tools/ListingFormatter'));
const BoxLabelResizer = lazy(() => import('./pages/tools/BoxLabelResizer'));
const FnskuSplitter = lazy(() => import('./pages/tools/FnskuSplitter'));
const BarcodeGenerator = lazy(() => import('./pages/tools/BarcodeGenerator'));
const ImageCompliance = lazy(() => import('./pages/tools/ImageCompliance'));
const AddressFormatter = lazy(() => import('./pages/tools/AddressFormatter'));
const InvoiceCleaner = lazy(() => import('./pages/tools/InvoiceCleaner'));

import './index.css';

// Electron uses HashRouter (file:// protocol), web uses BrowserRouter (for SEO)
const isElectron = !!window.electronAPI;
const Router = isElectron ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* SEO Tools - public, no login required */}
          <Route path="/tools" element={<Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" /></div>}><ToolsLayout /></Suspense>}>
            <Route index element={<ToolsHomePage />} />
            <Route path="search-terms" element={<SearchTermsCleaner />} />
            <Route path="title-optimizer" element={<TitleOptimizer />} />
            <Route path="flat-file-cleaner" element={<FlatFileCleaner />} />
            <Route path="listing-formatter" element={<ListingFormatter />} />
            <Route path="box-label-resizer" element={<BoxLabelResizer />} />
            <Route path="fnsku-splitter" element={<FnskuSplitter />} />
            <Route path="barcode-generator" element={<BarcodeGenerator />} />
            <Route path="image-compliance" element={<ImageCompliance />} />
            <Route path="address-formatter" element={<AddressFormatter />} />
            <Route path="invoice-cleaner" element={<InvoiceCleaner />} />
          </Route>

          {/* Main app - requires login */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pdf/editor" element={<PdfPage />} />
            <Route path="/pdf/clean" element={<PdfCleanPage />} />
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

          <Route path="/" element={<Navigate to="/tools" replace />} />
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
    </Router>
  </StrictMode>,
);
