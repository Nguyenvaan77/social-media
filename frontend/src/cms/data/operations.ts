/** Deterministic frontend-only operational metrics shown in the Stitch dashboards. */
export const demoKioskOperations = {
  totalStations: 25,
  onlineStations: 24,
  averageLoad: 82.5,
  targetSlaHours: 48,
  zones: [
    { id: 'zone-central', name: 'Trung tâm đô thị', stations: 8, online: 8, load: 86 },
    { id: 'zone-riverside', name: 'Ven sông & Bến cảng', stations: 6, online: 6, load: 74 },
    { id: 'zone-market', name: 'Thương mại & Chợ', stations: 7, online: 6, load: 92 },
    { id: 'zone-culture', name: 'Văn hóa & Triển lãm', stations: 4, online: 4, load: 68 },
  ],
}
