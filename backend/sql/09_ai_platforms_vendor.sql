-- 09_ai_platforms_vendor.sql — add and populate ai_platforms.vendor.
--
-- WHY THIS EXISTS
-- ai_platforms (01_schema_migration.sql:59) never had a vendor column, so
-- GET /api/tools always returned vendor: null for every tool — not a
-- fabricated gap, an actually-missing column. Unlike criticality/documented
-- (which are genuine assessments someone has to make), the vendor of each
-- listed product is an objective, publicly known fact, so it's populated for
-- all 12 rows here rather than left partial.

alter table public.ai_platforms add column if not exists vendor text;

update public.ai_platforms set vendor = 'OpenAI'          where name = 'ChatGPT Enterprise';
update public.ai_platforms set vendor = 'Anthropic'       where name = 'Claude Pro';
update public.ai_platforms set vendor = 'GitHub (Microsoft)' where name = 'GitHub Copilot';
update public.ai_platforms set vendor = 'Google'           where name = 'Gemini Advanced';
update public.ai_platforms set vendor = 'Midjourney Inc.'  where name = 'Midjourney';
update public.ai_platforms set vendor = 'Jasper AI'        where name = 'Jasper AI';
update public.ai_platforms set vendor = 'Anysphere'        where name = 'Cursor';
update public.ai_platforms set vendor = 'Salesforce (Tableau)' where name = 'Tableau AI';
update public.ai_platforms set vendor = 'Notion Labs'      where name = 'Notion AI';
update public.ai_platforms set vendor = 'Grammarly Inc.'   where name = 'Grammarly Business';
update public.ai_platforms set vendor = 'Perplexity AI'    where name = 'Perplexity Pro';
update public.ai_platforms set vendor = 'DataRobot Inc.'   where name = 'DataRobot';

notify pgrst, 'reload schema';
