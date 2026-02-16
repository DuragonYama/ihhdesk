# OFA HR - Employee Frontend

Mobile-first employee portal for the OFA HR system.

## Project Structure

```
employee-frontend/
├── src/
│   ├── components/
│   │   ├── Layout.tsx          # Mobile layout with bottom nav
│   │   ├── ProtectedRoute.tsx  # Auth guard
│   │   └── LoadingSpinner.tsx  # Loading state
│   ├── pages/
│   │   ├── Login.tsx           # Login page (✅ Complete)
│   │   ├── Home.tsx            # Dashboard/overview (scaffold)
│   │   ├── Clock.tsx           # Clock in/out (scaffold)
│   │   ├── Absences.tsx        # My absences list (scaffold)
│   │   ├── RequestAbsence.tsx  # Request new absence (scaffold)
│   │   ├── Balance.tsx         # My balance/hours (scaffold)
│   │   ├── Calendar.tsx        # Events calendar (scaffold)
│   │   └── Profile.tsx         # Settings/profile (scaffold)
│   ├── store/
│   │   └── authStore.ts        # Zustand auth store
│   ├── utils/
│   │   └── api.ts              # Axios instance with interceptors
│   ├── types/
│   │   └── api.ts              # TypeScript interfaces
│   ├── App.tsx                 # Main app with routing
│   └── main.tsx                # Entry point
├── tailwind.config.js          # Tailwind config with OFA theme
├── postcss.config.js           # PostCSS config
├── .env                        # Environment variables
└── package.json                # Dependencies and scripts
```

## Features

✅ **Authentication**
- Login page with role validation (employees only)
- Zustand store with persistence
- Protected routes
- Auto-logout on 401

✅ **Mobile-First Design**
- Bottom navigation bar
- Sticky top header
- Touch-friendly UI
- Dark theme matching admin app

✅ **Infrastructure**
- React Router v7 for routing
- TanStack Query for data fetching
- Axios with auth interceptors
- TypeScript for type safety

## Setup

1. **Install dependencies:**
   ```bash
   cd employee-frontend
   npm install
   ```

2. **Configure environment:**
   - Edit `.env` to set `VITE_API_URL` if needed
   - Default: `http://localhost:8000`

3. **Run development server:**
   ```bash
   npm run dev
   ```
   - App runs on: http://localhost:5174

4. **Build for production:**
   ```bash
   npm run build
   ```

## Navigation Structure

The app has 5 main sections accessible via bottom navigation:

1. **Home (🏠)** - Dashboard with today's overview
2. **Klok (⏰)** - Clock in/out functionality
3. **Verlof (📅)** - View and request absences
4. **Saldo (📊)** - Hours balance and compensation
5. **Profiel (👤)** - Settings and profile

## API Integration

All API calls go through `/src/utils/api.ts` which:
- Adds Bearer token to requests automatically
- Handles 401 responses by logging out
- Points to backend at `VITE_API_URL`

## Authentication Flow

1. User visits app
2. If not logged in → redirect to `/login`
3. Login with username/password
4. Backend validates and returns token + user
5. Role check: must be 'employee'
6. Token stored in localStorage via Zustand
7. Token added to all API requests
8. On 401 → auto-logout and redirect to login

## Next Steps

The following pages need implementation:

1. **Home.tsx** - Dashboard with:
   - Today's clock status
   - Quick stats (hours worked this week, etc.)
   - Upcoming absences
   - Recent events

2. **Clock.tsx** - Clock in/out with:
   - Big clock in/out button
   - Current status (clocked in/out)
   - Today's hours
   - Car/parking/km inputs

3. **Absences.tsx** - Absence management with:
   - List of my absences (pending/approved/rejected)
   - Status badges
   - "Request New" button → RequestAbsence page

4. **RequestAbsence.tsx** - Request form with:
   - Date range picker
   - Type selector (sick/personal/vacation)
   - Reason textarea
   - Submit button

5. **Balance.tsx** - Balance overview with:
   - Current period balance
   - Extra/missing hours
   - Total parking costs
   - Total km driven

6. **Calendar.tsx** - Events calendar with:
   - Monthly calendar view
   - Company holidays
   - Events visible to me
   - Event details

7. **Profile.tsx** - Settings with:
   - User info display
   - Change password
   - App settings

## Theme Colors

Matching the admin app:

- `ofa-red`: #B93939 (primary accent)
- `ofa-red-hover`: #a33232 (hover state)
- `ofa-bg`: #181818 (secondary background)
- `ofa-bg-dark`: #121212 (main background)

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS 3** - Styling
- **React Router 7** - Routing
- **TanStack Query** - Data fetching
- **Zustand** - State management
- **Axios** - HTTP client
