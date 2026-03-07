// Idempotent migration for Supabase Postgres:
// - Adds `public.verse_bookmarks.favorite_count` (int, default 1, >=1)
// - Adds an index for favorites listing
// - Ensures RLS policies allow CRUD for the owner (authenticated user)
//
// Run: `node client/scripts/run_supabase_migration_favorite_count.js`

import fs from "fs";
import { Client } from "pg";

function parseDotEnv(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

async function main() {
  const envText = fs.readFileSync(new URL("../../.env", import.meta.url), "utf8");
  const env = parseDotEnv(envText);
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL missing in .env");
  }

  const connectionStrings = (() => {
    const list = [];
    try {
      const parsed = new URL(databaseUrl);
      const host = parsed.hostname || "";
      const port = String(parsed.port || "");
      const user = decodeURIComponent(parsed.username || "");
      const pass = decodeURIComponent(parsed.password || "");

      // Supabase pooler sometimes rejects connections depending on plan/settings.
      // If DATABASE_URL points to the pooler, prefer session mode on port 5432.
      if (host.endsWith("pooler.supabase.com") && user.includes(".") && pass) {
        // Some projects expose the IPv4 pooler in session mode on port 5432.
        if (port === "6543") {
          const sessionPooler = new URL(databaseUrl);
          sessionPooler.port = "5432";
          list.push(sessionPooler.toString());
        }
      }
      list.push(databaseUrl);
    } catch {
      // ignore parse errors
      list.push(databaseUrl);
    }
    return list;
  })();

  let lastErr = null;
  for (const conn of connectionStrings) {
    const client = new Client({
      connectionString: conn,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      await client.query("begin");

      await client.query("alter table public.verse_bookmarks add column if not exists favorite_count integer;");
      await client.query("update public.verse_bookmarks set favorite_count = 1 where favorite_count is null;");
      await client.query("alter table public.verse_bookmarks alter column favorite_count set default 1;");
      await client.query("alter table public.verse_bookmarks alter column favorite_count set not null;");

      await client.query("alter table public.verse_bookmarks drop constraint if exists verse_bookmarks_favorite_count_min;");
      await client.query("alter table public.verse_bookmarks add constraint verse_bookmarks_favorite_count_min check (favorite_count >= 1);");

      await client.query(
        "create index if not exists verse_bookmarks_user_id_favorite_count_idx on public.verse_bookmarks (user_id, favorite_count desc, created_at desc);"
      );

      // Policies are additive (permissive). Creating these should not break existing access patterns.
      await client.query("alter table public.verse_bookmarks enable row level security;");
      await client.query(`
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='verse_bookmarks' and policyname='verse_bookmarks_select_own'
  ) then
    create policy verse_bookmarks_select_own
      on public.verse_bookmarks
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='verse_bookmarks' and policyname='verse_bookmarks_insert_own'
  ) then
    create policy verse_bookmarks_insert_own
      on public.verse_bookmarks
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='verse_bookmarks' and policyname='verse_bookmarks_update_own'
  ) then
    create policy verse_bookmarks_update_own
      on public.verse_bookmarks
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='verse_bookmarks' and policyname='verse_bookmarks_delete_own'
  ) then
    create policy verse_bookmarks_delete_own
      on public.verse_bookmarks
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;
`);

      await client.query("commit");
      console.log("supabase migration ok: verse_bookmarks.favorite_count");
      await client.end();
      return;
    } catch (e) {
      lastErr = e;
      try {
        await client.query("rollback");
      } catch {
        // ignore
      }
      try {
        await client.end();
      } catch {
        // ignore
      }
      // try next connection string
    }
  }

  throw lastErr || new Error("Failed to connect to Supabase database");
}

main().catch((e) => {
  console.error("supabase migration failed");
  console.error(e?.message || String(e));
  process.exitCode = 1;
});
