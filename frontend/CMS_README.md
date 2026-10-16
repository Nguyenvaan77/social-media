# GeoKiosk CMS demo

The CMS is available at `/cms` in the existing React app. The social frontend at `/` remains available.

## Run locally

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/cms`. Run `npm run build` for TypeScript checking and a production build.

## Screens

| Screen | Route |
| --- | --- |
| User dashboard | `/cms/dashboard` |
| My locations | `/cms/locations` |
| Register a location | `/cms/locations/new` |
| Location detail | `/cms/locations/:id` |
| Location moderation | `/cms/moderation/locations` |
| Kiosk campaigns | `/cms/campaigns` |
| New Kiosk campaign | `/cms/campaigns/new` |
| Campaign detail | `/cms/campaigns/:id` |
| Area manager dashboard | `/cms/area` |
| Kiosk request moderation | `/cms/moderation/kiosks` |
| Admin dashboard | `/cms/admin` |
| Users and roles | `/cms/users` |

The current Stitch project also contains hardware management and geographic assignments screens. Those two screens are outside the requested 12-screen scope.

## Demo data and roles

Use the role selector in the top bar to switch between **User**, **Area Manager**, and **Admin**. Navigation and route access change with the selected role. This is a frontend demonstration; a real service must enforce authorization later.

Initial records live in `src/cms/data/seed.ts`. The typed data context and repository-style actions live in `src/cms/data/`. Changes are saved to browser `localStorage` under `diemden-cms-demo-v1`. Data is seeded on first load; malformed or older stored data falls back to the deterministic seed. Reloading the page keeps valid changes. To restart the demo, clear that localStorage key or call the `resetDemoData` action from the data context during development.

The map is an interactive local SVG mock. Kiosk previews, review decisions, campaign metrics, and any payment-related values are simulated. The CMS does not call a backend, map API, or payment provider.
