import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { CmsDataProvider, useCmsData } from './data'
import CmsShell from './components/CmsShell'
import { canAccessCmsPath, getCmsHome } from './components/cmsNavigation'
import { UserDashboardPage, AreaDashboardPage, AdminDashboardPage } from './pages/overview/OverviewPages'
import KioskModerationPage from './pages/KioskModerationPage'
import UserManagementPage from './pages/UserManagementPage'
import {
  MyLocationsPage, NewLocationPage, LocationDetailPage, LocationModerationPage,
} from './pages/locations'
import { CampaignListPage, CampaignNewPage, CampaignDetailPage } from './pages/campaigns'

function CmsHome() {
  const { currentRole } = useCmsData()
  return <Navigate to={getCmsHome(currentRole)} replace />
}

function CmsAccessGate() {
  const { currentRole } = useCmsData()
  const location = useLocation()
  return canAccessCmsPath(location.pathname, currentRole)
    ? <Outlet />
    : <Navigate to={getCmsHome(currentRole)} replace />
}

function CmsRouteTree() {
  return <Routes>
    <Route element={<CmsShell />}>
      <Route index element={<CmsHome />} />
      <Route element={<CmsAccessGate />}>
        <Route path="dashboard" element={<UserDashboardPage />} />
        <Route path="locations" element={<MyLocationsPage />} />
        <Route path="locations/new" element={<NewLocationPage />} />
        <Route path="locations/:id" element={<LocationDetailPage />} />
        <Route path="moderation/locations" element={<LocationModerationPage />} />
        <Route path="campaigns" element={<CampaignListPage />} />
        <Route path="campaigns/new" element={<CampaignNewPage />} />
        <Route path="campaigns/:id/edit" element={<CampaignNewPage />} />
        <Route path="campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="area" element={<AreaDashboardPage />} />
        <Route path="moderation/kiosks" element={<KioskModerationPage />} />
        <Route path="admin" element={<AdminDashboardPage />} />
        <Route path="users" element={<UserManagementPage />} />
      </Route>
      <Route path="*" element={<CmsHome />} />
    </Route>
  </Routes>
}

export default function CmsRouter() {
  return <CmsDataProvider><CmsRouteTree /></CmsDataProvider>
}
