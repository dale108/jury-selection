# Database Access

How to access and query the PostgreSQL database running in Docker.

## Quick Access

### Interactive psql Session

```bash
# Connect to the database
docker compose exec postgres psql -U voirdire -d voirdire

# Or with explicit connection string
docker compose exec postgres psql postgresql://voirdire:voirdire_secret@localhost/voirdire
```

Once connected, you can run SQL commands:
```sql
-- List all tables
\dt

-- List all sessions
SELECT * FROM sessions;

-- Count transcripts
SELECT COUNT(*) FROM transcript_segments;

-- List jurors with their speaker mappings
SELECT j.id, j.first_name, j.last_name, sm.speaker_label
FROM jurors j
LEFT JOIN speaker_mappings sm ON j.id = sm.juror_id;

-- Exit
\q
```

### Run Single SQL Command

```bash
# Execute a single query
docker compose exec postgres psql -U voirdire -d voirdire -c "SELECT COUNT(*) FROM sessions;"

# List all tables
docker compose exec postgres psql -U voirdire -d voirdire -c "\dt"

# Get all sessions
docker compose exec postgres psql -U voirdire -d voirdire -c "SELECT id, case_number, status FROM sessions;"
```

### Run SQL File

```bash
# Create a SQL file
cat > query.sql << EOF
SELECT 
    s.case_number,
    COUNT(DISTINCT j.id) as juror_count,
    COUNT(DISTINCT ts.id) as transcript_segments
FROM sessions s
LEFT JOIN jurors j ON s.id = j.session_id
LEFT JOIN transcript_segments ts ON s.id = ts.session_id
GROUP BY s.id, s.case_number;
EOF

# Execute it
docker compose exec -T postgres psql -U voirdire -d voirdire < query.sql
```

## Common Queries

### View All Sessions

```bash
docker compose exec postgres psql -U voirdire -d voirdire -c \
  "SELECT id, case_number, case_name, status, created_at FROM sessions ORDER BY created_at DESC;"
```

### View Jurors for a Session

```bash
# Replace {SESSION_ID} with actual UUID
docker compose exec postgres psql -U voirdire -d voirdire -c \
  "SELECT seat_number, first_name, last_name, occupation FROM jurors WHERE session_id = '{SESSION_ID}' ORDER BY seat_number;"
```

### View Transcript Segments

```bash
docker compose exec postgres psql -U voirdire -d voirdire -c \
  "SELECT speaker_label, COUNT(*) as segment_count, SUM(end_time - start_time) as total_time FROM transcript_segments GROUP BY speaker_label;"
```

### View Speaker Mappings

```bash
docker compose exec postgres psql -U voirdire -d voirdire -c \
  "SELECT j.first_name, j.last_name, sm.speaker_label FROM jurors j JOIN speaker_mappings sm ON j.id = sm.juror_id;"
```

### Get Juror with All Their Transcripts

```bash
# Replace {JUROR_ID} with actual UUID
docker compose exec postgres psql -U voirdire -d voirdire -c \
  "SELECT ts.speaker_label, ts.content, ts.start_time, ts.end_time 
   FROM transcript_segments ts 
   JOIN speaker_mappings sm ON ts.speaker_label = sm.speaker_label 
   WHERE sm.juror_id = '{JUROR_ID}' 
   ORDER BY ts.start_time;"
```

## Database Management

### Backup Database

```bash
# Create backup
docker compose exec postgres pg_dump -U voirdire voirdire > backup.sql

# Restore from backup
docker compose exec -T postgres psql -U voirdire -d voirdire < backup.sql
```

### Reset Database

```bash
# Drop and recreate (WARNING: Deletes all data!)
docker compose down -v
docker compose up -d postgres
docker compose exec postgres psql -U voirdire -d voirdire -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### View Database Size

```bash
docker compose exec postgres psql -U voirdire -d voirdire -c \
  "SELECT pg_size_pretty(pg_database_size('voirdire'));"
```

### List All Tables with Row Counts

```bash
docker compose exec postgres psql -U voirdire -d voirdire -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = schemaname AND table_name = tablename) as row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;"
```

## Using GUI Tools

### pgAdmin (Web Interface)

You can connect to the database using any PostgreSQL client:

- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `voirdire`
- **Username**: `voirdire`
- **Password**: `voirdire_secret`

### Popular GUI Tools:
- **pgAdmin** - https://www.pgadmin.org/
- **DBeaver** - https://dbeaver.io/
- **TablePlus** - https://tableplus.com/
- **Postico** (Mac) - https://eggerapps.at/postico/

## Connection String

For external tools:
```
postgresql://voirdire:voirdire_secret@localhost:5432/voirdire
```

