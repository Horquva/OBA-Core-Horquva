-- 13_drop_frozen_aggregates.sql — D-09b: drop the DROP-list tables.
--
-- WHY THIS EXISTS
-- D-09's sequencing: derive live -> migrate consumers -> verify equivalence ->
-- then drop. dept_health_scores, collaboration_scores, and predictive_risk_scores
-- were migrated to live domain/derived.js equivalents during W-B/W-D; zero code
-- anywhere still reads them. governance_assessments and continuity_assessments
-- were never migrated -- tracing during W-H found zero real product consumers
-- (only an admin health-check ping), so their two serving route files
-- (governance.js, continuity.js) were deleted outright instead of rewritten
-- (previous commit). Nothing in backend/ reads any of the 7 tables below as of
-- this migration.
--
-- CASCADE handles governance_gaps -> governance_assessments and
-- continuity_plans -> continuity_assessments (both FK'd in 05_foreign_keys.sql)
-- without needing an explicit drop order.

drop table if exists governance_gaps cascade;
drop table if exists governance_assessments cascade;
drop table if exists continuity_plans cascade;
drop table if exists continuity_assessments cascade;
drop table if exists collaboration_scores cascade;
drop table if exists predictive_risk_scores cascade;
drop table if exists dept_health_scores cascade;
