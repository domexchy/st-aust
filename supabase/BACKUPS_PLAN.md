# Database Backups & Disaster Recovery Plan
**St. Augustine International Academy — Supabase Infrastructure**

---

## 1. Executive Summary & RPO/RTO Objectives

Protecting institutional records (student admission applications, contact messages, news, events, and school media) requires a defense-in-depth backup strategy.

| Metric | Target | Description |
|---|---|---|
| **Recovery Point Objective (RPO)** | **< 24 Hours** (Free) / **< 2 Minutes** (PITR) | The maximum acceptable data loss in the event of hardware or storage failure. |
| **Recovery Time Objective (RTO)** | **< 1 Hour** | The target duration from declaring an incident to restoring full website functionality. |
| **Backup Retention Period** | **30 Days Daily** / **12 Months Monthly Archives** | Regulatory compliance for student academic and admissions filings. |

---

## 2. Supabase Native Backups (Platform-Level)

### A. Point-In-Time Recovery (PITR)
- **Availability:** Supabase Pro tier and enterprise addons.
- **Mechanism:** Continuous physical Write-Ahead Log (WAL) archiving.
- **Capability:** Allows the database administrator to restore the entire PostgreSQL cluster to any precise second within the past 7 to 28 days.
- **Dashboard Click Path:**
  1. Open [Supabase Project Dashboard](https://supabase.com/dashboard/project/_/database/backups/pitr).
  2. Navigate to **Database** &rarr; **Backups** &rarr; **Point in time**.
  3. Select the desired restore timestamp and click **Restore to this point**.

### B. Automated Daily Snapshots
- Supabase automatically takes daily backups of your database.
- Snapshots are stored in isolated, geo-redundant object storage.
- Downloadable directly from **Database** &rarr; **Backups** &rarr; **Scheduled backups**.

---

## 3. Self-Serve / Manual CLI Backups (Zero Cost & Offline Copies)

Regardless of cloud provider hosting, maintaining independent offline or offsite database dumps protects against account lockouts, accidental administrator deletions, and data corruption.

### Prerequisite: Database Connection String
Obtain your direct connection string from:
**Supabase Dashboard** &rarr; **Project Settings** &rarr; **Database** &rarr; **Connection string** (URI).

```bash
# Connection String Format:
postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Option 1: Standard `pg_dump` (Recommended for all PostgreSQL tools)

```bash
# 1. Full database dump (compressed custom format, includes schema and data)
pg_dump "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" \
  -Fc --clean --if-exists --no-owner --no-privileges \
  -f "st_aust_backup_$(date +%Y%m%d_%H%M%S).dump"

# 2. Schema-only export (DDL tables, views, RLS policies, triggers)
pg_dump "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" \
  --schema-only -f schema_export.sql

# 3. Data-only export for specific high-value tables (admissions, contact messages)
pg_dump "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" \
  --data-only -t public.admission_applications -t public.contact_messages \
  -f applications_data_$(date +%Y%m%d).sql
```

### Option 2: Supabase CLI (`supabase db dump`)

```bash
# Login to Supabase CLI
npx supabase login

# Link your local repo to the remote project
npx supabase link --project-ref [YOUR_PROJECT_REF]

# Dump public schema tables and RLS policies
npx supabase db dump -f supabase/backups/schema_$(date +%Y%m%d).sql

# Dump data records
npx supabase db dump --data-only -f supabase/backups/data_$(date +%Y%m%d).sql
```

---

## 4. Automated Offsite Backup Pipeline (GitHub Actions)

To ensure backups run automatically without human intervention, use the GitHub Actions workflow below. It executes nightly at 02:00 UTC, dumps the database, compresses it, and uploads it to private GitHub workflow artifacts (or an Amazon S3 / Cloudflare R2 bucket).

### Workflow File: `.github/workflows/db-backup.yml`

```yaml
name: Nightly Database Backup

on:
  schedule:
    - cron: '0 2 * * *' # Every night at 02:00 UTC
  workflow_dispatch:      # Allows manual trigger anytime from GitHub UI

jobs:
  backup:
    name: Backup Supabase Database
    runs-on: ubuntu-latest

    steps:
      - name: Install PostgreSQL Client Tools
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client

      - name: Execute pg_dump
        env:
          DATABASE_URL: ${{ secrets.SUPABASE_DB_URL }}
        run: |
          mkdir -p backups
          TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
          pg_dump "$DATABASE_URL" \
            -Fc --clean --if-exists --no-owner --no-privileges \
            -f "backups/st_aust_backup_${TIMESTAMP}.dump"
          
          # Compute SHA256 checksum for audit integrity
          sha256sum "backups/st_aust_backup_${TIMESTAMP}.dump" > "backups/checksum_${TIMESTAMP}.txt"

      - name: Store Backup as Workflow Artifact
        uses: actions/upload-artifact@v4
        with:
          name: db-backup-${{ github.run_id }}
          path: backups/
          retention-days: 30 # Retain for 30 days
```

---

## 5. Restoration Runbook (Disaster Recovery)

Follow these steps if a catastrophic data loss or accidental deletion occurs:

### Step 1: Pre-Restoration Lockdown
1. Notify administrators and temporarily set public forms into maintenance if necessary.
2. Ensure you have the `.dump` file and its SHA256 checksum verified.

### Step 2: Restore via `pg_restore`

```bash
# Restore entire database from custom dump archive
pg_restore -v --clean --if-exists --no-owner --no-privileges \
  -d "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" \
  st_aust_backup_20261026_020000.dump
```

### Step 3: Verification Post-Restoration Checklist
- [ ] Verify `profiles` table contains all admin and staff accounts.
- [ ] Check Row Level Security (RLS) remains enabled on all public tables:
  ```sql
  select tablename, rowsecurity from pg_tables where schemaname = 'public';
  ```
- [ ] Verify `public.is_admin()` and triggers exist and function.
- [ ] Test anonymous visit from front end:
  - News, events, and gallery items load correctly.
  - Form submission succeeds.
  - Zero-read security is intact (anonymous visitors cannot view submissions).
- [ ] Admin can log in to `/admin/login.html` and view messages & applications.
- [ ] Parents can log in to `/portal.html` and view their child's application status.

---

## 6. Audit & Review Schedule
- **Monthly:** Verify automated backup jobs run without failures.
- **Quarterly:** Conduct a test restore on a staging or local branch to ensure dump files remain compatible with the PostgreSQL engine version.
