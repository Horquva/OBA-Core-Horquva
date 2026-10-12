// =============================================================================
// Horquva Continuity Platform — Per-Request Context (AsyncLocalStorage)
// =============================================================================
// Lets deep code (DataService audit writes) know who is acting without
// threading the user through every method signature.
// =============================================================================

import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import type { UserAccount } from '../services/dataService.js';

export interface RequestContext {
  user?: UserAccount;
  /** Set once any audit entry is written for this request. */
  audited: boolean;
  /** Postgres writes this request triggered; awaited before a mutating response is sent. */
  pendingWrites?: Promise<void>[];
}

const storage = new AsyncLocalStorage<RequestContext>();

export function requestContext(_req: Request, _res: Response, next: NextFunction): void {
  storage.run({ audited: false }, () => next());
}

export function currentContext(): RequestContext | undefined {
  return storage.getStore();
}

/** The signed-in user id for the current request, if any. */
export function currentActorId(): string | undefined {
  return storage.getStore()?.user?.id;
}
