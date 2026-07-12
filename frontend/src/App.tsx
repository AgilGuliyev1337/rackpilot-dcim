import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { I18nProvider } from './context/I18nContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { DashboardPage } from './pages/Dashboard'
import { DataCentersPage } from './pages/DataCenters'
import { DataCenterDetailPage } from './pages/DataCenterDetail'
import { RacksPage } from './pages/Racks'
import { RackViewPage } from './pages/RackView'
import { FloorPlanPage } from './pages/FloorPlan'

// three.js is heavy — load the 3D view only when its route is visited
const Room3DPage = lazy(() =>
  import('./pages/Room3D').then((m) => ({ default: m.Room3DPage })),
)
import { AssetsPage } from './pages/Assets'
import { DeviceDetailPage } from './pages/DeviceDetail'
import { AuditLogPage } from './pages/AuditLog'
import { ReportsPage } from './pages/Reports'
import { LookupPage } from './pages/Lookup'
import { PrintLabelsPage } from './pages/PrintLabels'
import { WarehousesPage } from './pages/Warehouses'
import { WarehouseDetailPage } from './pages/WarehouseDetail'
import { StockItemDetailPage } from './pages/StockItemDetail'
import { SettingsPage } from './pages/Settings'

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/datacenters" element={<DataCentersPage />} />
                  <Route path="/datacenters/:id" element={<DataCenterDetailPage />} />
                  <Route
                    path="/datacenters/:dcId/rooms/:roomId/floorplan"
                    element={<FloorPlanPage />}
                  />
                  <Route
                    path="/datacenters/:dcId/rooms/:roomId/3d"
                    element={
                      <Suspense fallback={<div className="p-6 text-sm text-surface-500">Loading 3D view…</div>}>
                        <Room3DPage />
                      </Suspense>
                    }
                  />
                  <Route path="/racks" element={<RacksPage />} />
                  <Route path="/racks/:id" element={<RackViewPage />} />
                  <Route path="/assets" element={<AssetsPage />} />
                  <Route path="/assets/:id" element={<DeviceDetailPage />} />
                  <Route path="/lookup" element={<LookupPage />} />
                  <Route path="/labels" element={<PrintLabelsPage />} />
                  <Route path="/warehouses" element={<WarehousesPage />} />
                  <Route path="/warehouses/stock/:stockItemId" element={<StockItemDetailPage />} />
                  <Route path="/warehouses/:id" element={<WarehouseDetailPage />} />
                  <Route path="/audit" element={<AuditLogPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
    </I18nProvider>
  )
}
