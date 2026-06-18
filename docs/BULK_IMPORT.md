# Bulk Import

The bulk importer is a single admin endpoint that accepts four sections — coaches, students, teams, and players — and processes them in dependency order with strict reference checks.

## Endpoint

`POST /api/v1/admin/bulk/import` — admin only.

### Request body

```json
{
  "dryRun": false,
  "skipExisting": true,
  "upsert": false,
  "coaches":  [ { "email": "...", "first_name": "...", "last_name": "...", "phone": "...", "password": "..." } ],
  "students": [ { "email": "...", "first_name": "...", "last_name": "...", "student_number": "...", "phone": "...", "password": "..." } ],
  "teams":    [ { "name": "...", "hall_name": "Mitchell Hall", "sport_type": "football", "coach_email": "...", "description": "..." } ],
  "players":  [ { "email": "...", "sport": "football", "position": "forward", "hall_name": "Mitchell Hall", "team_name": "Mitchell FC" } ]
}
```

### Options

| Flag | Effect |
| --- | --- |
| `dryRun` | Parse, validate, return what would happen, write nothing. |
| `skipExisting` | (default `true`) On conflict, leave the existing row untouched and report it as `skipped`. |
| `upsert` | On conflict, update the existing row with the new field values. Useful for refreshing a roster mid-season. |

`skipExisting` and `upsert` are mutually exclusive. With neither flag, conflicts are hard errors.

### Section rules

- **Coaches** — `email`, `first_name`, `last_name` are required. `password` is optional; if omitted, a 10-character random password is generated and returned in the report. Coaches are never auto-created by team or student rows.
- **Students** — `email`, `first_name`, `last_name`, `student_number` are required. `student_number` is unique across all users. `password` is optional; if omitted, a random password is generated.
- **Teams** — `name` and a hall reference (`hall_name` or `hall_id`) are required. `sport_type` defaults to `football`. `coach_email` must resolve to an existing user with role=`coach` (either from the in-batch coaches section or already in the database). Unresolvable hall or coach is a hard error.
- **Players** — `email` is required and must reference an existing `User` with `role=student` (either from the in-batch students section or already in the database). `hall_name` is required. `team_name` is optional. When `team_name` is set, `Player.hall_id` must equal `Team.hall_id` (strict pairing).

### Hall resolution

Halls are read-only. The importer does not create or rename halls. A row that names a hall which does not exist is a hard error.

### Dependency order

1. **coaches** — written first so teams can attach them.
2. **students** — written next so players can attach to them.
3. **teams** — written next so players can attach to them.
4. **players** — written last; references resolved against the in-batch indexes first, then the database.

A single payload may mix all four sections. The server resolves cross-references within the same upload.

### Response shape

```json
{
  "success": true,
  "data": {
    "dry_run": false,
    "options": { "skipExisting": true, "upsert": false },
    "sections": {
      "coaches":  { "total": 3, "created": 2, "updated": 0, "skipped": 1, "failed": 0, "rows": [...] },
      "students": { "total": 12, "created": 12, "updated": 0, "skipped": 0, "failed": 0, "rows": [...] },
      "teams":    { "total": 3, "created": 3, "updated": 0, "skipped": 0, "failed": 0, "rows": [...] },
      "players":  { "total": 12, "created": 12, "updated": 0, "skipped": 0, "failed": 0, "rows": [...] }
    },
    "hard_errors": { "coaches": [], "students": [], "teams": [], "players": [] }
  }
}
```

Each row in `rows[]` carries the original row index (1-based for header), the row's identifier (`email`, `student_number`, `name`), the `status` (`created`, `updated`, `skipped`, `failed`), and on success a `user`, `team`, or `player` object. Generated passwords are only present on `status: "created"` rows.

### Status codes

- `200` — dry-run, or import completed with no failures.
- `207` — import completed but at least one row failed. Inspect `hard_errors` and per-section `failed` counts.
- `400` — request body malformed (no rows, wrong shape).
- `401` — missing or invalid token.
- `403` — authenticated user is not an admin.
- `500` — unexpected server error; nothing was written.

## CSV templates

The client-side `BulkImportModal` ships a template download per section:

| Section | Required columns |
| --- | --- |
| coaches | email, first_name, last_name, phone, password |
| students | email, first_name, last_name, student_number, phone, password |
| teams | name, hall_name, sport_type, coach_email, description |
| players | email, sport, position, hall_name, team_name, date_of_birth, height, weight |

`password` columns may be left blank to have the server generate a password. Generated passwords are returned in the import response, never persisted to logs.

## Audit

Each non-empty section that creates or updates at least one row writes one `AuditLog` row with `action: "BULK_IMPORT"`, `entity_type: <section>`, and a JSON `details` payload containing the totals.

## Typical workflow

1. Admin clicks "Coordinated Import" on the Admin or Teams page.
2. Admin downloads one or more templates, fills them in, and uploads.
3. Admin clicks "Preview (dry-run)" and reviews the report.
4. Admin clicks "Import 12 row(s)" to commit.
5. Server returns the section report and any generated passwords. Admin copies the generated passwords and distributes them out-of-band.