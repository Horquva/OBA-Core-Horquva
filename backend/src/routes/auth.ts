// =============================================================================
// Horquva Continuity Platform — Auth Routes (SRS SEC-01)
// =============================================================================
// GET  /api/auth/providers            — which SSO providers are configured
// GET  /api/auth/:provider/start      — redirect to the provider (PKCE)
// GET  /api/auth/:provider/callback   — exchange code, issue session cookie
// GET  /api/auth/session              — current user (401 when signed out)
// POST /api/auth/sign-out             — clear the session cookie
// POST /api/auth/dev/sign-in          — dev only, behind AUTH_DEV_LOGIN=true
//
// Only users already provisioned in the user store can sign in; SSO proves
// identity, it does not grant access on its own. The one exception is the
// deployment's first admin, named in BOOTSTRAP_ADMIN_EMAIL (auth/bootstrap.ts).
// =============================================================================

import { Router, type Request, type Response } from 'express';
import { DataService, type UserAccount } from '../services/dataService.js';
import { getEntraProvider } from '../auth/entra.js';
import { getGoogleProvider } from '../auth/google.js';
import { resolveUser } from '../auth/middleware.js';
import { bootstrapAdminFor } from '../auth/bootstrap.js';
import {
  AuthFlowError,
  buildAuthorizeUrl,
  exchangeCodeForClaims,
  randomToken,
  type AuthProviderId,
  type FetchLike,
  type OidcProvider,
} from '../auth/oidc.js';
import {
  FLOW_TTL_SECONDS,
  OIDC_FLOW_COOKIE,
  clearSessionCookie,
  cookieOptions,
  readCookie,
  setSessionCookie,
  signFlowState,
  verifyFlowState,
} from '../auth/session.js';

export interface AuthRouterOptions {
  /** Returns the configured providers; read lazily so env changes apply. */
  providers?: () => OidcProvider[];
  fetchImpl?: FetchLike;
}

export function defaultProviders(): OidcProvider[] {
  return [getEntraProvider(), getGoogleProvider()].filter((p): p is OidcProvider => p !== null);
}

function publicApiUrl(req: Request): string {
  return (process.env.PUBLIC_API_URL ?? `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
}

function frontendUrl(): string {
  return (process.env.FRONTEND_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
}

/** Only same-app relative paths; anything else could be an open redirect. */
function safeReturnTo(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/';
  return raw;
}

export function toSessionView(u: UserAccount) {
  return { userId: u.id, name: u.name, email: u.email, role: u.role, isHrManager: u.isHrManager, title: u.title };
}

function devLoginEnabled(): boolean {
  return process.env.AUTH_DEV_LOGIN === 'true' && process.env.NODE_ENV !== 'production';
}

export function createAuthRouter(opts: AuthRouterOptions = {}): Router {
  const router = Router();
  const providers = opts.providers ?? defaultProviders;
  const fetchImpl = opts.fetchImpl ?? fetch;

  const findProvider = (id: string) => providers().find((p) => p.id === id) ?? null;

  // SEC-06: sign-in events are audited here; the generic audit middleware skips /api/auth.
  const audit = (actor: string, action: string, details: string) =>
    DataService.getInstance().addAuditEntry(actor, action, 'auth', details);

  const failRedirect = (res: Response, code: string, provider = 'unknown') => {
    audit('anonymous', 'SIGN_IN_FAILED', `${provider}: ${code}`);
    res.redirect(302, `${frontendUrl()}/sign-in?error=${encodeURIComponent(code)}`);
  };

  router.get('/providers', (_req, res) => {
    res.json({ providers: providers().map((p) => p.id), devLogin: devLoginEnabled() });
  });

  router.get('/session', async (req, res) => {
    const user = await resolveUser(req);
    if (!user) {
      res.status(401).json({ error: 'Not signed in.' });
      return;
    }
    res.json(toSessionView(user));
  });

  router.post('/sign-out', async (req, res) => {
    const user = await resolveUser(req);
    if (user) audit(user.id, 'SIGN_OUT', 'session cleared');
    clearSessionCookie(res);
    res.status(204).end();
  });

  router.post('/dev/sign-in', async (req, res) => {
    if (!devLoginEnabled()) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    const user = typeof req.body?.email === 'string' ? DataService.getInstance().getUserByEmail(req.body.email) : null;
    if (!user) {
      res.status(403).json({ error: 'No OBA account exists for that email.' });
      return;
    }
    await setSessionCookie(res, { userId: user.id, provider: 'dev' });
    audit(user.id, 'SIGN_IN', 'dev');
    res.json(toSessionView(user));
  });

  router.get('/:provider/start', async (req, res) => {
    const provider = findProvider(req.params.provider);
    if (!provider) {
      res.status(404).json({ error: `Sign-in with ${req.params.provider} is not configured.` });
      return;
    }
    const flow = {
      provider: provider.id as AuthProviderId,
      state: randomToken(),
      nonce: randomToken(),
      codeVerifier: randomToken(48),
      returnTo: safeReturnTo(req.query.returnTo),
    };
    res.cookie(OIDC_FLOW_COOKIE, await signFlowState(flow), cookieOptions(FLOW_TTL_SECONDS));
    res.redirect(
      302,
      buildAuthorizeUrl(provider, {
        redirectUri: `${publicApiUrl(req)}/api/auth/${provider.id}/callback`,
        state: flow.state,
        nonce: flow.nonce,
        codeVerifier: flow.codeVerifier,
      })
    );
  });

  router.get('/:provider/callback', async (req, res) => {
    const { maxAge: _ignored, ...flowCookieOpts } = cookieOptions(0);
    res.clearCookie(OIDC_FLOW_COOKIE, flowCookieOpts);

    const provider = findProvider(req.params.provider);
    if (!provider) return failRedirect(res, 'provider_not_configured');

    if (typeof req.query.error === 'string') return failRedirect(res, 'provider_denied', provider.id);

    const flowToken = readCookie(req, OIDC_FLOW_COOKIE);
    const flow = flowToken ? await verifyFlowState(flowToken) : null;
    if (!flow || flow.provider !== provider.id || flow.state !== req.query.state) {
      return failRedirect(res, 'invalid_state', provider.id);
    }
    if (typeof req.query.code !== 'string') return failRedirect(res, 'missing_code', provider.id);

    try {
      const claims = await exchangeCodeForClaims(
        provider,
        {
          code: req.query.code,
          redirectUri: `${publicApiUrl(req)}/api/auth/${provider.id}/callback`,
          codeVerifier: flow.codeVerifier,
          nonce: flow.nonce,
        },
        fetchImpl
      );
      const mapped = provider.emailFromClaims(claims);
      if ('error' in mapped) {
        console.warn(`[auth] ${provider.id} account rejected: ${mapped.error}`);
        return failRedirect(res, 'account_rejected', provider.id);
      }

      const ds = DataService.getInstance();
      let user = ds.getUserByEmail(mapped.email);
      if (!user) {
        user = await bootstrapAdminFor(ds, mapped.email, claims); // saved before any session exists
        if (!user) return failRedirect(res, 'not_provisioned', provider.id);
      }

      await setSessionCookie(res, { userId: user.id, provider: provider.id });
      audit(user.id, 'SIGN_IN', provider.id);
      res.redirect(302, `${frontendUrl()}${flow.returnTo}`);
    } catch (err) {
      // Express 4 does not catch async throws, so every failure must end in a redirect here.
      const code = err instanceof AuthFlowError ? err.code : 'server_error';
      console.warn(`[auth] ${provider.id} sign-in failed: ${(err as Error).message}`);
      return failRedirect(res, code, provider.id);
    }
  });

  return router;
}

export const authRouter = createAuthRouter();
