import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Download,
  LockKeyhole, Mail, MapPin, MoreHorizontal, Plus, Search, ShieldCheck,
  SlidersHorizontal, Trash2, UserRound, Users, X,
} from 'lucide-react'
import { useCmsData } from '../data'
import type { CmsRole, CmsUser, UserStatus } from '../data'
import './user-management.scss'

const roleLabels: Record<CmsRole, string> = { user: 'Người dùng', area_manager: 'Quản lý khu vực', admin: 'Quản trị viên' }
const statusLabels: Record<UserStatus, string> = { active: 'Hoạt động', suspended: 'Tạm khóa' }
const permissions = [
  { key: 'approve_locations', title: 'Kiểm duyệt vị trí đăng ký', description: 'Cho phép duyệt địa điểm và yêu cầu thay đổi thông tin.' },
  { key: 'approve_kiosk', title: 'Duyệt nội dung chiến dịch Kiosk', description: 'Cho phép kiểm tra nội dung quảng cáo trước khi phát sóng.' },
  { key: 'campaign_reports', title: 'Xem báo cáo doanh thu & Tài chính', description: 'Truy cập chỉ số và báo cáo chiến dịch.' },
]
const defaultPermissions: Record<CmsRole, string[]> = {
  user: [], area_manager: ['approve_locations', 'approve_kiosk'],
  admin: permissions.map((item) => item.key),
}
const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN')
const initials = (value: string) => value.trim().split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase()).join('')

export default function UserManagementPage() {
  const { users, locations, addUser, updateUser, updateLocation, deleteUser } = useCmsData()
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<CmsRole | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState(users[0]?.id ?? '')
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<CmsRole>('user')
  const [formError, setFormError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draftRole, setDraftRole] = useState<CmsRole>('user')
  const [draftPermissions, setDraftPermissions] = useState<string[]>([])
  const [draftLocationIds, setDraftLocationIds] = useState<string[]>([])
  const [locationQuery, setLocationQuery] = useState('')

  const filtered = useMemo(() => users.filter((user) => {
    const haystack = `${user.name} ${user.email} ${user.organization} ${user.id}`.toLocaleLowerCase('vi')
    return (roleFilter === 'all' || user.role === roleFilter) &&
      (statusFilter === 'all' || user.status === statusFilter) &&
      haystack.includes(query.toLocaleLowerCase('vi').trim())
  }), [users, query, roleFilter, statusFilter])
  const pageSize = 5
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize)
  const selected = users.find((item) => item.id === selectedId)

  useEffect(() => { setPage(1) }, [query, roleFilter, statusFilter])
  useEffect(() => {
    if (selectedId && !users.some((item) => item.id === selectedId)) setSelectedId(users[0]?.id ?? '')
  }, [users, selectedId])
  useEffect(() => {
    if (!selected) return
    setDraftRole(selected.role)
    setDraftPermissions(selected.permissions ?? defaultPermissions[selected.role])
    setDraftLocationIds(locations.filter((item) => item.managerId === selected.id).map((item) => item.id))
    setLocationQuery('')
  }, [selected?.id, selected?.role, selected?.permissions, locations])

  function cancelDraft() {
    if (!selected) return
    setDraftRole(selected.role)
    setDraftPermissions(selected.permissions ?? defaultPermissions[selected.role])
    setDraftLocationIds(locations.filter((item) => item.managerId === selected.id).map((item) => item.id))
    setLocationQuery('')
  }

  function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newName.trim().length < 2) { setFormError('Tên cần ít nhất 2 ký tự.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) { setFormError('Email không hợp lệ.'); return }
    if (users.some((item) => item.email.toLowerCase() === newEmail.trim().toLowerCase())) { setFormError('Email này đã tồn tại.'); return }
    const user = addUser({ name: newName.trim(), email: newEmail.trim(), role: newRole, permissions: defaultPermissions[newRole] })
    setSelectedId(user.id)
    setShowNew(false)
    setNewName(''); setNewEmail(''); setNewRole('user'); setFormError('')
    setFeedback(`Đã thêm ${user.name}.`)
  }

  function saveRole() {
    if (!selected) return
    updateUser(selected.id, { role: draftRole, permissions: draftPermissions })
    for (const location of locations) {
      const shouldAssign = draftRole === 'area_manager' && draftLocationIds.includes(location.id)
      if (shouldAssign && location.managerId !== selected.id) {
        updateLocation(location.id, { managerId: selected.id })
      } else if (!shouldAssign && location.managerId === selected.id) {
        updateLocation(location.id, { managerId: undefined })
      }
    }
    setFeedback(`Đã cập nhật quyền và phân khu của ${selected.name}.`)
  }

  function removeUser() {
    if (!selected) return
    const name = selected.name
    deleteUser(selected.id)
    setConfirmDelete(false)
    setFeedback(`Đã xóa ${name}.`)
  }

  function exportCsv() {
    const rows = [['ID', 'Tên', 'Email', 'Vai trò', 'Trạng thái', 'Tổ chức'], ...filtered.map((item) => [item.id, item.name, item.email, roleLabels[item.role], statusLabels[item.status], item.organization])]
    const content = '\uFEFF' + rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
    link.download = 'geokiosk-users.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const assignmentQuery = locationQuery.toLocaleLowerCase('vi').trim()
  const matchingLocations = locations.filter((item) =>
    `${item.name} ${item.address} ${item.district} ${item.city} ${item.id}`
      .toLocaleLowerCase('vi').includes(assignmentQuery),
  ).sort((a, b) => Number(draftLocationIds.includes(b.id)) - Number(draftLocationIds.includes(a.id)))
  const draftAssignmentCount = draftRole === 'area_manager' ? draftLocationIds.length : 0
  return <div className="cms-page cms-users">
    <div className="cms-page-heading"><div className="cms-page-heading__intro"><span className="cms-users__eyebrow">QUẢN TRỊ VIÊN / NGƯỜI DÙNG & PHÂN QUYỀN</span><h1>Quản lý Người dùng & Phân quyền</h1><p>Quản trị tài khoản, vai trò, trạng thái và quyền truy cập cho toàn bộ cộng đồng.</p></div><div className="cms-page-heading__actions"><button className="cms-button cms-button--outline" type="button" onClick={exportCsv}><Download size={15} /> Xuất dữ liệu</button><button className="cms-button cms-button--primary" type="button" onClick={() => setShowNew(true)}><Plus size={15} /> Thêm người dùng mới</button></div></div>
    <div className="cms-users__summary"><span><Users size={16} /> Tổng cộng <strong>{users.length}</strong></span><span><Check size={15} /> Hoạt động <strong>{users.filter((item) => item.status === 'active').length}</strong></span><span><ShieldCheck size={15} /> Quản lý <strong>{users.filter((item) => item.role === 'area_manager').length}</strong></span><span><LockKeyhole size={15} /> Tạm khóa <strong>{users.filter((item) => item.status === 'suspended').length}</strong></span></div>
    {feedback && <div className="cms-users__feedback" role="status"><Check size={15} /> {feedback}<button type="button" onClick={() => setFeedback('')} aria-label="Đóng thông báo"><X size={14} /></button></div>}
    <div className="cms-users__workspace"><section className="cms-card cms-users__table-card"><div className="cms-users__toolbar"><div className="cms-users__search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm theo tên, email, tổ chức..." aria-label="Tìm người dùng" /></div><label>Vai trò <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as CmsRole | 'all')}><option value="all">Tất cả vai trò</option><option value="user">Người dùng</option><option value="area_manager">Quản lý khu vực</option><option value="admin">Quản trị viên</option></select></label><label>Trạng thái <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as UserStatus | 'all')}><option value="all">Tất cả trạng thái</option><option value="active">Hoạt động</option><option value="suspended">Tạm khóa</option></select></label><SlidersHorizontal size={16} /></div>
      {selectedRows.length > 0 && <div className="cms-users__bulk"><strong>{selectedRows.length} người dùng đã chọn</strong><button type="button" onClick={() => { selectedRows.forEach((id) => updateUser(id, { status: 'active' })); setSelectedRows([]); setFeedback('Đã kích hoạt các tài khoản đã chọn.') }}>Kích hoạt</button><button type="button" onClick={() => { selectedRows.forEach((id) => updateUser(id, { status: 'suspended' })); setSelectedRows([]); setFeedback('Đã tạm khóa các tài khoản đã chọn.') }}>Tạm khóa</button></div>}
      <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th><input type="checkbox" aria-label="Chọn tất cả trên trang" checked={visible.length > 0 && visible.every((user) => selectedRows.includes(user.id))} onChange={(event) => setSelectedRows(event.target.checked ? [...new Set([...selectedRows, ...visible.map((user) => user.id)])] : selectedRows.filter((id) => !visible.some((user) => user.id === id)))} /></th><th>Tên / Thông tin người dùng</th><th>Vai trò</th><th>Phân bổ quản lý</th><th>Trạng thái</th><th>Hoạt động cuối</th><th></th></tr></thead><tbody>{visible.map((user) => <tr key={user.id} className={selectedId === user.id ? 'is-selected' : ''} onClick={() => setSelectedId(user.id)}><td onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Chọn ${user.name}`} checked={selectedRows.includes(user.id)} onChange={(event) => setSelectedRows(event.target.checked ? [...selectedRows, user.id] : selectedRows.filter((id) => id !== user.id))} /></td><td><div className="cms-users__person"><span className="cms-users__avatar">{initials(user.name)}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td><td><span className={`cms-users__role cms-users__role--${user.role}`}>{roleLabels[user.role]}</span></td><td>{user.role === 'area_manager' ? `${locations.filter((item) => item.managerId === user.id).length} địa điểm` : user.organization}</td><td><span className={`cms-badge cms-badge--${user.status === 'active' ? 'approved' : 'suspended'}`}>{statusLabels[user.status]}</span></td><td>{date(user.lastActiveAt)}</td><td><button className="cms-users__more" type="button" aria-label={`Xem quyền của ${user.name}`} onClick={() => setSelectedId(user.id)}><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></div>{!visible.length && <div className="cms-empty"><Users size={25} /><h3>Không tìm thấy người dùng</h3><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}<div className="cms-pagination"><span>Hiển thị {visible.length} trên {filtered.length} người dùng</span><div className="cms-pagination__buttons"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} aria-label="Trang trước"><ChevronLeft size={15} /></button><button type="button" aria-current="page">{page}</button><button type="button" onClick={() => setPage((value) => Math.min(pages, value + 1))} disabled={page >= pages} aria-label="Trang sau"><ChevronRight size={15} /></button></div></div></section>
      <aside className="cms-card cms-users__drawer">{selected ? <><div className="cms-users__drawer-head"><span>HỒ SƠ NGƯỜI DÙNG <ChevronRight size={12} /> PHÂN QUYỀN</span><button type="button" onClick={() => setSelectedId('')} aria-label="Đóng chi tiết"><X size={16} /></button></div><div className="cms-users__profile"><span className="cms-users__avatar cms-users__avatar--large">{initials(selected.name)}</span><div><h2>{selected.name}</h2><small>{selected.email}</small><span className={`cms-badge cms-badge--${selected.status === 'active' ? 'approved' : 'suspended'}`}>{statusLabels[selected.status]}</span></div></div><div className="cms-users__drawer-section"><h3>Vai trò & quyền hạn</h3><div className="cms-users__role-choice">{(['user', 'area_manager', 'admin'] as const).map((role) => <button type="button" className={draftRole === role ? 'is-active' : ''} key={role} onClick={() => { setDraftRole(role); setDraftPermissions(defaultPermissions[role]) }}>{roleLabels[role]}</button>)}</div></div>
        <div className="cms-users__drawer-section"><div className="cms-users__assignment-heading"><h3>Phân khu quản lý</h3><strong>{draftAssignmentCount} địa điểm</strong></div><p>Địa điểm được phân công cho tài khoản quản lý khu vực.</p>{draftRole === 'area_manager' ? <><label className="cms-users__assignment-search"><Search size={14} /><input value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Tìm địa điểm hoặc khu vực..." aria-label="Tìm địa điểm phân công" /></label><div className="cms-users__assignments">{matchingLocations.map((item) => { const otherManager = item.managerId && item.managerId !== selected.id ? users.find((user) => user.id === item.managerId) : undefined; return <label key={item.id}><input type="checkbox" checked={draftLocationIds.includes(item.id)} onChange={(event) => setDraftLocationIds((ids) => event.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id))} /><MapPin size={13} /><span>{item.name}<small>{item.district}, {item.city}{otherManager ? ` · Đang giao ${otherManager.name}` : ''}</small></span></label> })}{matchingLocations.length === 0 && <div className="cms-users__assignment-empty">Không tìm thấy địa điểm phù hợp.</div>}</div></> : <div className="cms-users__note">{draftRole === 'admin' ? 'Quản trị viên truy cập toàn bộ khu vực. Các địa điểm đang phân công sẽ được thu hồi khi lưu.' : 'Chỉ quản lý khu vực mới cần phân công địa điểm. Các địa điểm đang phân công sẽ được thu hồi khi lưu.'}</div>}</div>
        <div className="cms-users__drawer-section"><h3>Quyền truy cập chi tiết</h3><div className="cms-users__permissions">{permissions.map((permission) => <label key={permission.key}><span><strong>{permission.title}</strong><small>{permission.description}</small></span><input type="checkbox" checked={draftPermissions.includes(permission.key)} onChange={(event) => setDraftPermissions(event.target.checked ? [...draftPermissions, permission.key] : draftPermissions.filter((item) => item !== permission.key))} /></label>)}</div></div>
        <div className="cms-users__drawer-section cms-users__drawer-status"><button type="button" className="cms-button cms-button--outline" onClick={() => { updateUser(selected.id, { status: selected.status === 'active' ? 'suspended' : 'active' }); setFeedback(`Đã cập nhật trạng thái ${selected.name}.`) }}>{selected.status === 'active' ? 'Tạm khóa tài khoản' : 'Kích hoạt tài khoản'}</button><button type="button" className="cms-users__delete" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Xóa</button></div><div className="cms-users__drawer-footer"><button className="cms-button cms-button--outline" type="button" onClick={cancelDraft}>Hủy bỏ</button><button className="cms-button cms-button--primary" type="button" onClick={saveRole}><Check size={15} /> Lưu phân quyền</button></div></> : <div className="cms-empty"><UserRound size={26} /><h3>Chọn người dùng</h3><p>Chi tiết quyền và phân khu sẽ hiển thị ở đây.</p></div>}</aside></div>
    {showNew && <div className="cms-users__modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNew(false) }}><form className="cms-users__modal" role="dialog" aria-modal="true" aria-labelledby="new-user-title" onSubmit={createUser}><div><h2 id="new-user-title">Thêm người dùng mới</h2><button type="button" aria-label="Đóng" onClick={() => setShowNew(false)}><X size={17} /></button></div><p>Tạo tài khoản demo để thử phân quyền và quản lý khu vực.</p><label className="cms-field"><span>Họ và tên *</span><input className="cms-input" value={newName} onChange={(event) => { setNewName(event.target.value); setFormError('') }} autoFocus /></label><label className="cms-field"><span>Email *</span><input className="cms-input" type="email" value={newEmail} onChange={(event) => { setNewEmail(event.target.value); setFormError('') }} /></label><label className="cms-field"><span>Vai trò</span><select className="cms-select" value={newRole} onChange={(event) => setNewRole(event.target.value as CmsRole)}><option value="user">Người dùng</option><option value="area_manager">Quản lý khu vực</option><option value="admin">Quản trị viên</option></select></label>{formError && <small className="cms-field__error" role="alert">{formError}</small>}<footer><button className="cms-button cms-button--outline" type="button" onClick={() => setShowNew(false)}>Hủy</button><button className="cms-button cms-button--primary" type="submit">Tạo tài khoản</button></footer></form></div>}
    {confirmDelete && selected && <div className="cms-users__modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmDelete(false) }}><div className="cms-users__modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title"><div><h2 id="delete-user-title"><CircleAlert size={19} /> Xóa người dùng</h2><button type="button" aria-label="Đóng" onClick={() => setConfirmDelete(false)}><X size={17} /></button></div><p>Xóa {selected.name} cùng dữ liệu liên quan trong bản demo? Thao tác này sẽ được lưu trong trình duyệt.</p><footer><button className="cms-button cms-button--outline" type="button" onClick={() => setConfirmDelete(false)}>Hủy</button><button className="cms-button cms-button--danger" type="button" onClick={removeUser}>Xóa người dùng</button></footer></div></div>}
  </div>
}
