-- 10_ai_platforms_knowledge_gaps.sql — assess the 8 ai_platforms that had no
-- knowledge_assets row at all.
--
-- WHY THIS EXISTS
-- knowledge_assets (01_schema_migration.sql:217) only had rows for 4 of the
-- 12 ai_platforms (ChatGPT Enterprise, GitHub Copilot, Tableau AI,
-- DataRobot), so GET /api/tools returned criticality/documented: null for
-- the other 8 — genuinely never assessed, not a bug. These 8 rows are
-- demo-authored assessments (topic, is_documented, criticality) in the same
-- style as the 4 that already existed — not derived from any real audit,
-- same as the rest of this fictional company's seed data. owner_id matches
-- each platform's tool_ownership row.

insert into public.knowledge_assets (asset_type, asset_id, topic, is_documented, criticality, owner_id)
select 'platform', p.id, v.topic, v.is_documented, v.criticality, o.employee_id
from public.ai_platforms p
join public.tool_ownership o on o.platform_id = p.id
join (values
  ('Claude Pro',           'Claude Pro enterprise configuration',      true,  'high'),
  ('Gemini Advanced',      'Gemini Advanced access configuration',     false, 'medium'),
  ('Midjourney',           'Midjourney workspace settings',            false, 'low'),
  ('Jasper AI',            'Jasper AI brand voice configuration',      false, 'medium'),
  ('Cursor',               'Cursor IDE integration settings',          true,  'medium'),
  ('Notion AI',            'Notion AI workspace configuration',        true,  'medium'),
  ('Grammarly Business',   'Grammarly Business policy configuration',  true,  'low'),
  ('Perplexity Pro',       'Perplexity Pro access configuration',      false, 'low')
) as v(name, topic, is_documented, criticality) on v.name = p.name
where not exists (
  select 1 from public.knowledge_assets k
  where k.asset_type = 'platform' and k.asset_id = p.id
);

notify pgrst, 'reload schema';
