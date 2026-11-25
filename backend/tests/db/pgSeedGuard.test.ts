import { describe, it, expect, afterEach } from 'vitest';
import { seedFixtureOrgToPg } from '../pg/db.js';

describe('seedFixtureOrgToPg _test database guard', () => {
  const origDatabaseUrl = process.env.DATABASE_URL;
  const origPgTestUrl = process.env.PG_TEST_URL;

  afterEach(() => {
    if (origDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = origDatabaseUrl;

    if (origPgTestUrl === undefined) delete process.env.PG_TEST_URL;
    else process.env.PG_TEST_URL = origPgTestUrl;
  });

  it('refuses when neither DATABASE_URL nor PG_TEST_URL is set', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.PG_TEST_URL;
    await expect(seedFixtureOrgToPg()).rejects.toThrow(/_test/);
  });

  it('refuses a production or non-_test DATABASE_URL even if PG_TEST_URL ends in _test', async () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/horquva_prod';
    process.env.PG_TEST_URL = 'postgresql://postgres:postgres@localhost:5432/horquva_test';
    await expect(seedFixtureOrgToPg()).rejects.toThrow(/_test/);
  });

  it('refuses an _e2e database name', async () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/horquva_e2e';
    delete process.env.PG_TEST_URL;
    await expect(seedFixtureOrgToPg()).rejects.toThrow(/_test/);
  });

  it('refuses a database name with _test only in query params', async () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/horquva?application_name=foo_test';
    delete process.env.PG_TEST_URL;
    await expect(seedFixtureOrgToPg()).rejects.toThrow(/_test/);
  });
});
