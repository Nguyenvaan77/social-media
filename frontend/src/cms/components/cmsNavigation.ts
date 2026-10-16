import type { LucideIcon } from 'lucide-react'
import {
  ClipboardCheck,
  LayoutDashboard,
  MapPin,
  MapPinned,
  Megaphone,
  MonitorPlay,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { CmsRole } from '../data/types'

export interface CmsNavigationItem {
  label: string
  path: string
  icon: LucideIcon
  roles: CmsRole[]
  activeFor?: string[]
}

export interface CmsNavigationGroup {
  label: string
  items: CmsNavigationItem[]
}

const allRoles: CmsRole[] = ['user', 'area_manager', 'admin']
const managementRoles: CmsRole[] = ['area_manager', 'admin']

export const cmsNavigationGroups: CmsNavigationGroup[] = [
  {
    label: 'Chính',
    items: [
      { label: 'Tổng quan', path: '/cms/dashboard', icon: LayoutDashboard, roles: allRoles },
      { label: 'Địa điểm của tôi', path: '/cms/locations', icon: MapPin, roles: allRoles, activeFor: ['/cms/locations/new', '/cms/locations/:id'] },
      { label: 'Đăng ký địa điểm', path: '/cms/locations/new', icon: MapPinned, roles: allRoles },
      { label: 'Chiến dịch Kiosk', path: '/cms/campaigns', icon: Megaphone, roles: allRoles, activeFor: ['/cms/campaigns/new', '/cms/campaigns/:id'] },
    ],
  },
  {
    label: 'Quản lý khu vực',
    items: [
      { label: 'Bảng điều khiển khu vực', path: '/cms/area', icon: LayoutDashboard, roles: managementRoles },
      { label: 'Yêu cầu địa điểm', path: '/cms/moderation/locations', icon: ShieldCheck, roles: managementRoles },
      { label: 'Yêu cầu Kiosk', path: '/cms/moderation/kiosks', icon: MonitorPlay, roles: managementRoles },
    ],
  },
  {
    label: 'Quản trị viên',
    items: [
      { label: 'Bảng điều khiển quản trị', path: '/cms/admin', icon: ClipboardCheck, roles: ['admin'] },
      { label: 'Người dùng & Phân quyền', path: '/cms/users', icon: Users, roles: ['admin'] },
    ],
  },
]

export const cmsRoleLabels: Record<CmsRole, string> = {
  user: 'Người dùng',
  area_manager: 'Quản lý khu vực',
  admin: 'Quản trị viên',
}

export function getCmsHome(role: CmsRole): string {
  return role === 'admin' ? '/cms/admin' : role === 'area_manager' ? '/cms/area' : '/cms/dashboard'
}

export function getCmsPageLabel(pathname: string): string {
  if (pathname === '/cms/locations/new') return 'Đăng ký địa điểm'
  if (/^\/cms\/locations\/[^/]+$/.test(pathname)) return 'Chi tiết địa điểm'
  if (pathname === '/cms/campaigns/new') return 'Tạo chiến dịch Kiosk'
  if (/^\/cms\/campaigns\/[^/]+\/edit$/.test(pathname)) return 'Chỉnh sửa chiến dịch Kiosk'
  if (/^\/cms\/campaigns\/[^/]+$/.test(pathname)) return 'Chi tiết chiến dịch Kiosk'
  for (const group of cmsNavigationGroups) {
    const item = group.items.find((candidate) => candidate.path === pathname)
    if (item) return item.label
  }
  return 'Không gian làm việc'
}

export function canAccessCmsPath(pathname: string, role: CmsRole): boolean {
  if (pathname === '/cms' || pathname === '/cms/') return true
  if (pathname === '/cms/locations/new' || /^\/cms\/locations\/[^/]+$/.test(pathname)) return true
  if (pathname === '/cms/campaigns/new' || /^\/cms\/campaigns\/[^/]+(?:\/edit)?$/.test(pathname)) return true
  for (const group of cmsNavigationGroups) {
    const item = group.items.find((candidate) => candidate.path === pathname)
    if (item) return item.roles.includes(role)
  }
  return false
}

export function isCmsNavActive(item: CmsNavigationItem, pathname: string): boolean {
  if (item.path === pathname) return true
  if (item.path === '/cms/locations' && /^\/cms\/locations\/[^/]+$/.test(pathname) && pathname !== '/cms/locations/new') return true
  if (item.path === '/cms/campaigns' && /^\/cms\/campaigns\/[^/]+(?:\/edit)?$/.test(pathname)) return true
  return false
}

