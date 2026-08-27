-- 12_consolidate_single_tenant.sql — D-01: consolidate app_users onto one org.
--
-- WHY THIS EXISTS
-- app_users held 4 distinct org values (horquva, Horquva QA, pp, yy) despite
-- OBA Core being single-tenant by design (no business table carries an org
-- column — see lib/orgGuard.js). Three of the four are QA/test-account
-- stragglers from before ORG_SLUG existed as an env var; every registration
-- since has landed on 'horquva'. Owner reviewed all 5 rows on 2026-08-25 and
-- chose to rewrite org rather than delete the non-'horquva' accounts, so
-- every existing login keeps working.

update public.app_users set org = 'horquva' where org <> 'horquva';
