# CareSync HMS

A Hospital Management System with three role-based portals (**Admin**, **Doctor**, **Patient**).

- **Backend:** Java 21, Spring Boot 3.4.5, Spring Security + JWT, Spring Data JPA, MySQL / MariaDB
- **Frontend:** React 19 + Vite (multi-page build)

## Features

- Role-based login (Admin / Doctor / Patient) and forgot password (accounts are created by an admin)
- **Admin:** patient, doctor and department management, appointments with a status filter (All / Confirmed / Pending), emergency triage, dashboard with patient and doctor search
- **Billing:** invoices with custom services, in-patient bed types with admin-editable prices, payment-status filter (All / Paid / Unpaid / Partial), invoice sent to the patient, PDF download
- **Doctor:** dashboard, schedule, patient list, view patients' uploaded health records, e-prescription, voice dictation
- **Patient:** dashboard, appointments, billing, electronic health records (upload PDF or images), rule-based symptom checker
- Notifications (bell) and chat between admin, doctor and patient
- Health records are role-protected: patients see only their own, doctors see only their assigned or booked patients, admins see all

## Project structure

```
CareSync/
├── caresync-backend/     Spring Boot REST API (port 3000) + database/ SQL scripts
└── caresync-frontend/    React + Vite app (port 5173)
```

## Prerequisites

| Tool | Version |
|------|---------|
| JDK | 21 |
| Node.js | 18 or newer (with npm) |
| MySQL / MariaDB (e.g. XAMPP) | running on port 3306 |

## Getting started

### 1. Clone

```bash
git clone https://github.com/jobayer-mahin/CareSync.git
cd CareSync
```

### 2. Database

Start MySQL / MariaDB. The default config uses user `root` with an empty password
(edit `caresync-backend/src/main/resources/application.properties` if yours differs).
The database `caresync_hms_db` is created automatically on first run, and demo data is loaded at startup.

Optional: to create the database manually, run the scripts in `caresync-backend/database/`:

```bash
mysql -u root -p < caresync-backend/database/run_all.sql
```

(On Windows you can use `caresync-backend/database/install.ps1`.)

### 3. Run the backend

```bash
cd caresync-backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
```

The API starts at `http://localhost:3000`.
If port 3000 is already in use, the app may need another port (for example 3001). Free port 3000, or point the frontend to the new address (see Configuration notes).

### 4. Run the frontend

```bash
cd caresync-frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@caresync.com` | `admin123` |
| Doctor | `doctor@demo.com` | `pass123` |
| Patient | `patient@demo.com` | `pass123` |

## Testing

```bash
# Backend
cd caresync-backend
./mvnw test

# Frontend
cd caresync-frontend
npm test
```

## Configuration notes

- If the backend runs on a different address, change `API_BASE` at the top of `caresync-frontend/src/lib/api.js`.
- Add your frontend URL to `cors.allowed-origins` in `application.properties` when deploying.
- Change `jwt.secret` before any real deployment.
- Email settings are read from the environment variables `CARESYNC_MAIL_HOST`, `CARESYNC_MAIL_PORT`, `CARESYNC_MAIL_USERNAME` and `CARESYNC_MAIL_PASSWORD`.
- Uploaded health records are limited to 8 MB per file. Very large files may also hit MySQL's `max_allowed_packet` limit.

## Production build (frontend)

```bash
npm run build      # output in dist/
npm run preview
```

## Team

| Member | Responsibility |
|--------|----------------|
| Arzu | Patient and Doctor modules |
| Jobayer | Admin module |

## License

For academic use.
