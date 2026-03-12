# Supabase Setup

1. Create a project at https://supabase.com
2. Run `migrations/00001_init.sql` in the SQL editor
3. Enable Email auth: Authentication > Providers > Email
4. Copy keys into .env files:

**Frontend .env**
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

**Backend .env**
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- DATABASE_URL  (Settings > Database > Connection string > URI)
- DIRECT_URL    (same as DATABASE_URL for direct connections)
