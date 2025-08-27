# Dental Task Manager (Dockerized)

A lightweight task & rota manager tailored for dental practices.  
Includes role-based dashboards (Admin/HR/Director/Employee), task scheduling (Task Sheet, Daily, Weekly, Monthly, Quarterly, Six Months, Annually), messenger, notifications, rota with role & location, and CSV/Excel exports.

## ✨ Features
- **Auth & Roles**: Admin, HR, Director, Employee.
- **User Management**: Admin can create/delete users.
- **Tasks**:
  - Frequencies: **Task Sheet** (ad-hoc), Daily, Weekly, Monthly, Quarterly, Six Months, Annually.
  - Assign to specific user; due dates; complete; comment.
  - HR/Director can download **CSV**/**Excel** (see Reports on Dashboard).
- **Dashboards**:
  - **Employees**: "Your role today" (only their rota), unread **Notifications** at bottom.
  - **Managers**: KPIs, today’s full rota, reports.
- **Messenger**: DM any user; notifications on new messages.
- **Notifications**: Task assigned/completed, task comments, rota assignments, messages. Clear one/clear all.
- **Rota**:
  - Managers assign **Employee → Role → Location** (in that order).
  - Roles (defaults): Dentist, Nurse, Receptionist, Hygienist, Therapist, Manager, Admin.
  - Locations (defaults): Surgery 1/2/3, Reception 1/2, Sterilization, Office.
  - **Employees only see their own rota** (privacy enforced on backend).

---

dental-task-manager/
├─ backend/
│ ├─ src/
│ │ ├─ index.js
│ │ ├─ models/
│ │ │ └─ db.js # JSON DB + seed users + lists (frequencies/rota roles/locations)
│ │ ├─ lib/
│ │ │ └─ notify.js # Notification helper
│ │ ├─ routes/
│ │ │ ├─ auth.js # login, logout, users, audit
│ │ │ ├─ tasks.js # tasks + comments + enriched list
│ │ │ ├─ messages.js # DM + mark read
│ │ │ ├─ rota.js # rota + privacy + meta (roles/locations)
│ │ │ ├─ notifications.js # list/mark read/read-all
│ │ │ └─ reports.js # CSV/XLSX export
│ │ └─ middleware/
│ │ └─ auth.js
│ └─ package.json
├─ frontend/
│ ├─ src/
│ │ ├─ context/AuthContext.jsx
│ │ ├─ components/
│ │ │ ├─ Navbar.jsx
│ │ │ └─ NotificationBell.jsx
│ │ └─ pages/
│ │ ├─ Dashboard.jsx # employee-first layout + unread notifications bottom
│ │ ├─ TasksPage.jsx # Task Sheet tab on right; purple when active
│ │ ├─ MessagesPage.jsx
│ │ └─ RotaPage.jsx # Employee → Role → Location assignment flow
│ ├─ index.html
│ ├─ src/index.css (Tailwind)
│ ├─ vite.config.js
│ ├─ postcss.config.cjs
│ ├─ tailwind.config.js
│ ├─ package.json
│ ├─ .env # VITE_API_BASE=http://localhost:8000
│ ├─ Dockerfile
│ └─ nginx.conf
├─ backend-data/ # persisted JSON DB (created at runtime)
│ └─ db.json # (git-ignored)
├─ docker-compose.yml
└─ README.md

yaml
Copy code

---

## 🚀 Quick Start (Docker)

**Prereqs**: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

1) Ensure environment values (already in compose):
- Backend: `JWT_SECRET`, `CORS_ORIGIN`, `DATA_PATH`
- Frontend: `frontend/.env` → `VITE_API_BASE=http://localhost:8000`

2) Build & run:
```bash
docker compose up -d --build
Open:

Frontend (Nginx): http://localhost:5174

Backend API: http://localhost:8000/

Sign in (seed users):

admin@example.com / admin123

hr@example.com / hr123

director@example.com / director123

employee@example.com / employee123

Data is persisted to backend-data/db.json.

🔁 Rebuild after code changes
Backend only:

bash
Copy code
docker compose up -d --no-deps --build backend
Frontend only:

bash
Copy code
docker compose up -d --no-deps --build frontend
⚙️ Environment
docker-compose.yml (important bits)
yaml
Copy code
services:
  backend:
    environment:
      PORT: 8000
      JWT_SECRET: ${JWT_SECRET:-super-secret-change-me}
      CORS_ORIGIN: http://localhost:5174,http://127.0.0.1:5174
      DATA_PATH: /data/db.json
    volumes:
      - ./backend-data:/data
  frontend:
    ports:
      - "5174:80"   # visit http://localhost:5174
frontend/.env
ini
Copy code
VITE_API_BASE=http://localhost:8000
📊 Exports
CSV: GET /reports/tasks.csv

Excel:GET /reports/tasks.xlsx
(Links available on Dashboard for HR/Director.)

🔐 Auth & Privacy
JWT stored in memory; expires 8h.

Audit log stored in db.auditLogs.

Rota endpoints restrict Employees to only their own entries (month/day views).

🛠️ Common Troubleshooting
Login failed

Ensure frontend points at backend: frontend/.env → VITE_API_BASE=http://localhost:8000 and rebuild frontend.

Backend CORS includes your frontend origin(s) in CORS_ORIGIN.

Reseed demo users: stop stack, rename DB, start backend:

bash
Copy code
docker compose down
mv backend-data/db.json backend-data/db.bak.json  # Windows: ren backend-data\db.json db.bak.json
docker compose up -d --build backend
Port already allocated (5174)

Change mapping to "5175:80" in compose → rebuild frontend, browse to http://localhost:5175.

compose error: services must be a mapping

Ensure there is one services: key at the top (no duplicates).

Frontend white page / Vite/PostCSS errors

Ensure these dev deps exist in frontend/package.json:

@vitejs/plugin-react, tailwindcss, autoprefixer, vite

PostCSS config must be CommonJS: postcss.config.cjs.

Rebuild frontend.

Backend cannot find a route file

Confirm file names & imports (case-sensitive in Docker). Example: routes/notifications.js exists and is imported in src/index.js.

🧪 API Quick Reference
POST /auth/login { email, password } → { token, user }

POST /auth/logout

GET /auth/users (Admin/HR/Director)

POST /auth/users (Admin)

DELETE /auth/users/:id (Admin)

GET /tasks / GET /tasks/enriched

POST /tasks (Admin/HR/Director)

PATCH /tasks/:id/complete

POST /tasks/:id/comments / GET /tasks/:id/comments

GET /messages?peerId / POST /messages / POST /messages/read

GET /notifications (supports ?unread=1&limit=...) / POST /notifications/read / POST /notifications/read-all

GET /rota?month=YYYY-MM / GET /rota/day?date=YYYY-MM-DD / GET /rota/meta

POST /rota (Admin/HR/Director) / DELETE /rota/:id

🤝 Contributing
PRs welcome. Please keep UI minimal and accessible; avoid heavy dependencies.

📝 License
MIT

yaml
Copy code

---

### `.gitignore`
```gitignore
# Node
node_modules/
npm-debug.log*
pnpm-lock.yaml
yarn.lock

# Frontend build
frontend/dist/

# IDE / OS
.DS_Store
.vscode/
*.swp

# Runtime data
backend-data/db.json

# Env files (optional to ignore)
*.env"# Task-Management-App" 
"# dental-task-manager" 
