import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'

export default function MainLayout() {
  return (
    <div className="app-shell">
      <Header />
      <Outlet />
    </div>
  )
}
