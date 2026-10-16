import { useMemo, useState, type CSSProperties } from 'react'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import type { Location } from '../data/types'

export interface MockMapProps {
  locations: Location[]
  selectedId?: string | null
  onSelect?: (location: Location) => void
  className?: string
  height?: number | string
  showControls?: boolean
}

function hash(value: string): number {
  let result = 0
  for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) | 0
  return Math.abs(result)
}

export default function MockMap({
  locations,
  selectedId,
  onSelect,
  className = '',
  height = 320,
  showControls = true,
}: MockMapProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const activeId = selectedId === undefined ? internalSelectedId : selectedId
  const activeLocation = locations.find((location) => location.id === activeId)
  const positions = useMemo(() => {
    const valid = locations.filter((location) => Number.isFinite(location.latitude) && Number.isFinite(location.longitude))
    const minLat = Math.min(...valid.map((location) => location.latitude))
    const maxLat = Math.max(...valid.map((location) => location.latitude))
    const minLng = Math.min(...valid.map((location) => location.longitude))
    const maxLng = Math.max(...valid.map((location) => location.longitude))
    const latSpan = maxLat - minLat
    const lngSpan = maxLng - minLng
    return locations.map((location) => {
      const seed = hash(location.id)
      const x = lngSpan > .005 && Number.isFinite(location.longitude)
        ? 19 + ((location.longitude - minLng) / lngSpan) * 62
        : 26 + (seed % 48)
      const y = latSpan > .005 && Number.isFinite(location.latitude)
        ? 76 - ((location.latitude - minLat) / latSpan) * 55
        : 23 + (Math.floor(seed / 47) % 53)
      return { location, x: Math.min(87, Math.max(13, x)), y: Math.min(80, Math.max(18, y)) }
    })
  }, [locations])

  const style = { height: typeof height === 'number' ? `${height}px` : height } as CSSProperties

  function select(location: Location) {
    setInternalSelectedId(location.id)
    onSelect?.(location)
  }

  return (
    <div className={`cms-mock-map ${className}`.trim()} style={style} aria-label="Bản đồ mô phỏng các địa điểm">
      <div className="cms-mock-map__scene" style={{ transform: `scale(${zoom})` }}>
        <svg className="cms-mock-map__svg" viewBox="0 0 1000 650" preserveAspectRatio="xMidYMid slice" role="presentation" aria-hidden="true">
          <rect width="1000" height="650" fill="#e9eee8" />
          <path d="M0 0H405L363 120L266 188L0 148Z M710 0H1000V148L805 216L684 118Z M0 436L205 385L351 478L292 650H0Z M686 409L1000 344V650H742Z" fill="#dcebdc" />
          <path d="M358 0L438 73L475 150L511 191L543 273L525 353L562 422L626 500L608 650" fill="none" stroke="#b5d8df" strokeWidth="53" />
          <path d="M358 0L438 73L475 150L511 191L543 273L525 353L562 422L626 500L608 650" fill="none" stroke="#d0edf0" strokeWidth="42" />
          <g fill="#dce6d7" stroke="#c7d3c3" strokeWidth="2">
            <path d="M35 42L189 58L213 152L73 169Z M213 35L351 39L322 125L230 137Z M65 201L200 194L215 298L45 305Z M227 199L367 177L348 280L233 299Z M51 352L216 340L228 399L75 430Z M235 327L354 303L381 389L255 409Z" />
            <path d="M605 40L753 36L771 132L644 144Z M795 34L956 41L964 156L797 174Z M637 178L795 157L829 280L665 285Z M844 203L960 182L962 298L862 316Z M649 317L793 317L811 394L662 401Z M836 348L969 335L970 449L837 446Z" />
            <path d="M69 470L214 445L242 539L73 554Z M262 447L372 423L392 541L278 553Z M37 576L220 562L203 641L57 632Z M260 575L390 566L412 650H235Z" />
            <path d="M682 447L817 432L817 510L697 527Z M839 472L973 467L979 564L854 566Z M667 551L826 540L839 639L659 637Z M861 581L981 585L987 643L863 644Z" />
          </g>
          <g fill="none" stroke="#c7d0ce" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
            <path d="M-20 171C164 170 296 149 430 170S744 210 1020 174" />
            <path d="M-20 323C185 325 368 297 493 304S778 319 1020 311" />
            <path d="M-20 562C186 542 346 554 558 521S835 501 1020 520" />
            <path d="M223 -20C235 123 241 291 244 425S224 594 231 680" />
            <path d="M765 -20C778 125 813 311 821 422S825 574 833 680" />
            <path d="M59 -20C113 160 104 307 84 417S31 557 32 680" />
            <path d="M933 -20C916 125 939 268 942 403S922 573 938 680" />
          </g>
          <g fill="none" stroke="#fffdf8" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
            <path d="M-20 171C164 170 296 149 430 170S744 210 1020 174" />
            <path d="M-20 323C185 325 368 297 493 304S778 319 1020 311" />
            <path d="M-20 562C186 542 346 554 558 521S835 501 1020 520" />
            <path d="M223 -20C235 123 241 291 244 425S224 594 231 680" />
            <path d="M765 -20C778 125 813 311 821 422S825 574 833 680" />
            <path d="M59 -20C113 160 104 307 84 417S31 557 32 680" />
            <path d="M933 -20C916 125 939 268 942 403S922 573 938 680" />
          </g>
          <g fill="none" stroke="#fffdf8" strokeWidth="8" strokeLinecap="round">
            <path d="M-10 68L372 78 M-10 237L416 241 M-10 486L398 472 M66 621L418 610 M603 84L1015 82 M611 248L1015 249 M640 389L1015 383 M640 605L1015 612" />
            <path d="M144 -10L161 650 M325 -10L338 650 M678 -10L695 650 M867 -10L891 650" />
            <path d="M335 60L429 130 M326 244L454 276 M356 375L471 429 M630 143L559 197 M670 293L575 340 M683 462L598 493" />
          </g>
          <g fill="#77938b" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="700" letterSpacing="1.5">
            <text x="100" y="117">QUẬN 1</text><text x="674" y="118">BÌNH THẠNH</text><text x="105" y="374">QUẬN 4</text><text x="738" y="372">THỦ ĐỨC</text><text x="150" y="590">QUẬN 7</text><text x="699" y="589">QUẬN 2</text>
          </g>
          <g fill="#8ca3a6" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="700" letterSpacing="1">
            <text x="446" y="251" transform="rotate(70 446 251)">SÔNG SÀI GÒN</text><text x="393" y="164">ĐẠI LỘ VÕ VĂN KIỆT</text><text x="387" y="316">ĐẠI LỘ ĐÔNG TÂY</text><text x="815" y="510">MAI CHÍ THỌ</text>
          </g>
          <g fill="#b7cdbb"><circle cx="98" cy="222" r="20" /><circle cx="329" cy="380" r="17" /><circle cx="706" cy="245" r="21" /><circle cx="901" cy="425" r="18" /></g>
        </svg>
        {positions.map(({ location, x, y }) => (
          <button
            key={location.id}
            type="button"
            className={`cms-mock-map__marker${activeId === location.id ? ' cms-mock-map__marker--active' : ''}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={`Chọn địa điểm ${location.name}`}
            aria-pressed={activeId === location.id}
            title={location.name}
            onClick={() => select(location)}
          ><span className="cms-mock-map__pin"><span /></span></button>
        ))}
      </div>
      {activeLocation && <div className="cms-mock-map__selection"><strong>{activeLocation.name}</strong><span>{activeLocation.address}</span></div>}
      {showControls && (
        <div className="cms-mock-map__controls" aria-label="Điều khiển bản đồ">
          <button type="button" aria-label="Phóng to bản đồ" disabled={zoom >= 1.4} onClick={() => setZoom((value) => Math.min(1.4, +(value + .2).toFixed(1)))}><Plus size={16} /></button>
          <button type="button" aria-label="Thu nhỏ bản đồ" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, +(value - .2).toFixed(1)))}><Minus size={16} /></button>
          <button type="button" aria-label="Đặt lại bản đồ" onClick={() => setZoom(1)}><LocateFixed size={16} /></button>
        </div>
      )}
      <div className="cms-mock-map__attribution">Bản đồ mô phỏng · GeoKiosk</div>
    </div>
  )
}
