# RVCS Demo POS Application

This is a Next.js POS application integrated with a pure git-like Version Control System (VCS) state engine.

## Database Management

If you delete or need to recreate the database (`custom.db` under the `db/` folder), run the following unified command:

```bash
npm run db:setup
```

This command runs:
1. `npx prisma db push` — to recreate the SQLite database and sync schema tables.
2. `npm run db:seed` — to seed catalog items, sizes, and modifier state options.

### Individual commands:

* **Sync database schema**:
  ```bash
  npm run db:push
  ```
* **Seed database**:
  ```bash
  npm run db:seed
  ```
