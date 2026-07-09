# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Consumer Price Index (CPI) Compilation Suite** — A full-stack web application for managing CPI data collection, compilation, and approval workflows. Built with React 19 + Vite on the frontend and Django 5.1 + DRF on the backend.

### Key Characteristics
- **Role-based access control** (Admin, Compiler, Approver, Reviewer, User)
- **Compilation workflow** with multi-stage approval pipeline
- **Price data management** and historical indexing
- **Real-time dashboard** with fallback data
- **File upload/parsing** for bulk data imports
- **JWT-based authentication** with token auto-refresh

---

## Development Setup & Commands

### Frontend (React + Vite)
```bash
cd frontend

# Install dependencies
npm install

# Start dev server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Type check
npx tsc -b

# Lint code
npm run lint
```

**Key Ports:**
- Frontend: `http://localhost:5173` (Vite dev server)
- Backend proxy: `/api/*` → `http://localhost:8000/api/*`

### Backend (Django)
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start dev server
python manage.py runserver
# or with different port:
python manage.py runserver 0.0.0.0:8000

# Create superuser
python manage.py createsuperuser

# Create test user (see create_test_user.py for details)
python create_test_user.py
```

**Key Ports:**
- Backend: `http://localhost:8000`
- Admin: `http://localhost:8000/admin/`
- API: `http://localhost:8000/api/`

### Celery (Background Tasks)
```bash
cd backend

# Start Celery worker
celery -A cpi_api worker -l info

# Start Celery beat (for scheduled tasks)
celery -A cpi_api beat -l info
```

---

## Architecture Overview

### Frontend Architecture

**Tech Stack:**
- React 19 (component library)
- Vite (build tool)
- TypeScript (type safety)
- Redux Toolkit + redux-persist (state management)
- React Router v7 (routing)
- Tailwind CSS (styling, dark mode support via `class` strategy)
- Chart.js + Recharts (data visualization)
- Axios (HTTP client with auto-token refresh)

**Key Directory Structure:**
```
frontend/src/
├── pages/              # Page components (routing destinations)
├── components/         # Reusable UI components
├── layouts/            # Layout wrappers (MainLayouts, CompileLayout, RefData)
├── routes/             # Route definitions (index, AdminRoutes, MainRoutes, UserRoutes)
├── store/              # Redux store setup with persistence
├── features/           # Redux slices (auth, compilation, capi, base_item)
├── api/                # API service layer (dashboardAPI, http client)
├── hooks/              # Custom React hooks
├── context/            # React Context (if used)
├── types/              # TypeScript type definitions
├── constants/          # App constants (ROLES, etc.)
├── utils/              # Utility functions
├── services/           # Business logic services
├── styles/             # Global styles
└── workers/            # Web Workers (if any)
```

**State Management (Redux):**
- `store/store.ts` configures Redux with persistence (only auth state persists)
- Slices use Redux Toolkit for cleaner action/reducer patterns
- Auto-refresh token logic integrated in API layer (see initAuth in App.tsx)

**Routing:**
- `routes/index.tsx` — main route configuration
- `routes/AdminRoutes.tsx` — admin-only pages
- `routes/MainRoutes.tsx` — authenticated routes
- `routes/UserRoutes.tsx` — user-level routes
- Routes wrapped in `ProtectedRoute` component for auth checks

**Authentication Flow:**
1. Login at `/login` → JWT tokens stored in Redux + localStorage
2. Token auto-refresh via axios interceptor (initAuth)
3. Dashboard loads after login → role-based sidebar menu rendered
4. Protected routes check Redux auth state

### Backend Architecture

**Tech Stack:**
- Django 5.1 (web framework)
- Django REST Framework (API)
- SimpleJWT (JWT auth)
- Django CORS Headers (cross-origin requests)
- Djoser (user management endpoints)
- Celery (async tasks, scheduled jobs)
- PostgreSQL (primary DB, dev uses SQLite)
- Parquet/Pandas (data processing)

**Key Directory Structure:**
```
backend/
├── cpi_api/              # Main project settings
│   ├── settings.py       # Django config (INSTALLED_APPS, MIDDLEWARE, JWT config)
│   ├── urls.py           # Root URL router
│   ├── celery.py         # Celery config
│   ├── asgi.py           # ASGI config (for WebSockets, etc.)
│   └── wsgi.py           # WSGI config (production)
├── api/                  # Main API app
│   ├── models.py         # Database models
│   ├── urls.py           # API route definitions
│   ├── authentication/   # Auth views (login, signup, OTP)
│   ├── compilation/      # Compilation workflow views
│   ├── capi_api/         # CAPI data upload/processing
│   ├── approval/         # Approval workflow
│   ├── reports/          # Report generation
│   ├── uploads/          # File upload handling
│   ├── base_data/        # Reference data (items, weights, jurisdictions)
│   ├── master_data/      # Master data management
│   ├── utils/            # Helper functions
│   ├── schema/           # Data schema definitions
│   └── migrations/       # Database migrations
├── data/                 # Data files (reference, test)
├── logs/                 # Application logs
├── manage.py             # Django CLI
├── requirements.txt      # Python dependencies
└── .env                  # Environment variables (git-ignored)
```

**API Endpoints (sample):**
- `POST /api/auth/jwt/create/` — login (returns access + refresh tokens)
- `POST /api/auth/jwt/refresh/` — refresh access token
- `GET /api/all_india_level_index_item/` — latest index values
- `GET /api/all_india_index_item/` — historical trends
- `GET /api/approval-requests/` — pending approvals
- `POST /api/uploads/` — upload price data
- `GET /api/compilation_filter/` — filter metadata

**Authentication (JWT):**
- Tokens issued via SimpleJWT (`ACCESS_TOKEN_LIFETIME = 15 minutes`, `REFRESH_TOKEN_LIFETIME = 24 hours`)
- Frontend auto-refreshes before expiry (axios interceptor)
- Djoser provides user CRUD endpoints (`/api/auth/users/`, `/api/auth/password/change/`, etc.)

**Role-Based Access:**
- Roles stored in Django User model (via custom user manager or group permissions)
- API views check user role/permissions
- Frontend sidebar renders menu items based on role (defined in `Sidebar.tsx`)

---

## Common Development Tasks

### Adding a New Page
1. Create component in `frontend/src/pages/PageName.tsx`
2. Add route in `frontend/src/routes/index.tsx` or role-specific routes file
3. Add navigation link in sidebar (`frontend/src/components/Sidebar.tsx`)

### Adding a New API Endpoint
1. Create view/viewset in `backend/api/your_module/views.py`
2. Register URL in `backend/api/urls.py` or `backend/api/your_module/urls.py`
3. Add serializer in `backend/api/your_module/serializers.py` (if using DRF)
4. Create frontend service in `frontend/src/api/` (e.g., `yourModuleAPI.ts`)
5. Dispatch Redux actions or call service directly from components

### Modifying the Compilation Workflow
- Backend: `backend/api/compilation/` — views and logic
- Frontend: `frontend/src/pages/compilation/` — UI pages
- Dashboard: `frontend/src/pages/CompilationDashboard.tsx` — stats and charts
- Sidebar: Update menu items for new workflow steps

### Working with Data Upload
- Backend: `backend/api/uploads/` and `backend/api/uploads_and_compile/`
- Handles Parquet/CSV/Excel parsing
- Processes into database (models in `backend/api/models.py`)
- Frontend: `frontend/src/pages/upload/UploadPage.tsx` — file picker + progress

### Adding Redux State
1. Create slice in `frontend/src/features/your_feature/yourSlice.ts` using `createSlice`
2. Import and add to root reducer in `frontend/src/store/store.ts`
3. Use `useAppDispatch` and `useAppSelector` hooks in components
4. If state should persist, add key to `persistConfig.whitelist` in `store.ts`

---

## Key Files & Their Roles

| File | Purpose |
|------|---------|
| `frontend/src/App.tsx` | Root component; initializes auth & Redux |
| `frontend/src/main.tsx` | Entry point; mounts React app and Redux provider |
| `frontend/tailwind.config.ts` | Tailwind CSS config (dark mode, animations, colors) |
| `frontend/vite.config.ts` | Vite config (dev server, API proxy, plugins) |
| `backend/cpi_api/settings.py` | Django settings (INSTALLED_APPS, DB, AUTH, CORS) |
| `backend/cpi_api/urls.py` | Root URL router to all sub-apps |
| `backend/cpi_api/celery.py` | Celery task queue config |
| `backend/api/models.py` | All database models (ORM definitions) |
| `backend/api/urls.py` | API endpoint routing |
| `frontend/src/components/Sidebar.tsx` | Role-based navigation menu |
| `frontend/src/components/Navbar.tsx` | Top bar with breadcrumb, search, theme toggle |
| `frontend/src/api/http/axiosClient.ts` | HTTP client with token refresh interceptor |
| `frontend/src/features/auth/authSlice.ts` | Redux auth state (login, token, user) |

---

## Testing

### Frontend
- No dedicated test runner configured yet (consider adding Jest + React Testing Library)
- Manual testing via `npm run dev` + browser

### Backend
- Run migrations to test DB state: `python manage.py migrate`
- Ad-hoc scripts in root: `create_test_user.py`, `check_users.py`, `list_users.py`, `test.py`
- Django test framework available: `python manage.py test`

### API Testing
- Postman/Insomnia recommended for endpoint testing
- Login first to get tokens, then use in Authorization header: `Bearer <access_token>`

---

## Environment & Configuration

### Frontend `.env` (if needed)
```
VITE_API_BASE_URL=http://localhost:8000
```

### Backend `.env`
```
DEBUG=False
SECRET_KEY=<your-secret>
ALLOWED_HOSTS=localhost,127.0.0.1,<your-ip>
DATABASE_URL=postgresql://user:password@localhost/cpi_db
CELERY_BROKER_URL=redis://localhost:6379/0  # if using Celery
```

### Key Django Settings
- `DEBUG = False` (set to True for development if needed)
- `ALLOWED_HOSTS` — add your domain/IP
- `DATABASES` — PostgreSQL in production, SQLite in dev
- `CORS_ALLOWED_ORIGINS` — add frontend URL
- `SIMPLE_JWT` — token lifetimes (15 min access, 24 hr refresh)

---

## Notes & Quirks

1. **Token Auto-Refresh:** Frontend axios client automatically refreshes access tokens when expired. Check `frontend/src/api/http/axiosClient.ts` for interceptor logic.

2. **API Proxy:** Vite dev server proxies `/api/*` requests to backend. Both servers must run for full functionality.

3. **Dark Mode:** Tailwind is configured for class-based dark mode (`darkMode: "class"`). Theme toggle likely in navbar/sidebar.

4. **Redux Persistence:** Only `auth` state persists to localStorage. Other slices (compilation, capi, base) reset on page reload.

5. **Role Sidebar:** Menu items in `Sidebar.tsx` are filtered based on `user?.role`. Roles expected: `'admin'`, `'compiler'`, `'approver'`, `'reviewer'`, `'user'`.

6. **Database Models:** Check `backend/api/models.py` for the full schema (CompilationRequest, ApprovalRequest, PriceItem, etc.).

7. **Celery Tasks:** Async jobs (report generation, data processing) defined in `backend/api/` modules. Requires Redis/RabbitMQ and a running celery worker.

8. **Fallback Data:** Dashboard has mock/fallback data if APIs fail, ensuring graceful degradation.

---

## Resources

- **Dashboard Implementation:** See `DASHBOARD_IMPLEMENTATION.md` for feature walkthrough & customization guide
- **Django Docs:** https://docs.djangoproject.com/en/5.1/
- **React Docs:** https://react.dev
- **Redux Toolkit:** https://redux-toolkit.js.org
- **Vite:** https://vite.dev
- **Tailwind CSS:** https://tailwindcss.com
- **DRF:** https://www.django-rest-framework.org/
