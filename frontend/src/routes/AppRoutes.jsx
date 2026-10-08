import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout.jsx'
import HomePage from '../pages/HomePage.jsx'
import ProfilePage from '../pages/ProfilePage.jsx'
import ReelsPage from '../pages/ReelsPage.jsx'
import MessagesPage from '../pages/MessagesPage.jsx'
import FriendsPage from '../pages/FriendsPage.jsx'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="reels" element={<ReelsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="friends" element={<FriendsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
