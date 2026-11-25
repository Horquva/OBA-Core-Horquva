import { describe, it, expect, afterEach } from 'vitest';
import { assertTestDatabaseUrl, seedFixtureOrgToPg } from '../pg/db.js';

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

  it('refuses when DATABASE_URL is unset even if PG_TEST_URL ends in _test', async () => {
    delete process.env.DATABASE_URL;
    process.env.PG_TEST_URL = 'postgresql://postgres:postgres@localhost:5432/horquva_test';
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

  it('refuses a #fragment bypass ending in _test', async () => {
    const url = 'postgresql://postgres:postgres@localhost:5432/horquva_prod#foo_test';
    expect(() => assertTestDatabaseUrl(url)).toThrow(/_test/);
    process.env.DATABASE_URL = url;
    await expect(seedFixtureOrgToPg()).rejects.toThrow(/_test/);
  });

  it('refuses a multi-segment path bypass ending in _test', async () => {
    const url = 'postgresql://postgres:postgres@localhost:5432/horquva_prod/x_test';
    expect(() => assertTestDatabaseUrl(url)).toThrow(/_test/);
    process.env.DATABASE_URL = url;
    await expect(seedFixtureOrgToPg()).rejects.toThrow(/_test/);
  });

  it('refuses a malformed URL', async () => {
    const url = 'not-a-valid-url_test';
    expect(() => assertTestDatabaseUrl(url)).toThrow(/_test/);
    process.env.DATABASE_URL = url;
    await expect(seedFixtureOrgToPg()).rejects.toThrow(/_test/);
  });

  it('accepts valid single-segment _test database URLs with optional query string', () => {
    const basic = 'postgresql://postgres:postgres@localhost:5432/horquva_test';
    const withQuery = 'postgresql://postgres:postgres@localhost:5432/horquva-ci_test?sslmode=disable';
    expect(assertTestDatabaseUrl(basic)).toBe(basic);
    expect(assertTestDatabaseUrl(withQuery)).toBe(withQuery);
  });
});
