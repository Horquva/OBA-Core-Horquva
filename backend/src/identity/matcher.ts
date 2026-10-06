// =============================================================================
// Horquva Continuity Platform — Identity Resolution Engine
// =============================================================================
// Matches external accounts (n8n, Google, OpenAI, etc.) against authoritative
// corporate directory records (Entra ID, Google Workspace) per SRS ID-01.
// Automatically classifies non-human service accounts (svc-*, bot-*, *-automation@).
// =============================================================================

export interface DirectoryPersonRecord {
  id: string; // e.g. 'person:omar@acme.com'
  primaryEmail: string;
  displayName: string;
  aliases?: string[];
  department?: string;
  status: 'active' | 'departed';
}

export interface MatchCandidate {
  externalAccountId: string;
  source: string;
  email?: string;
  displayName?: string;
}

export interface MatchResult {
  candidate: MatchCandidate;
  matched: boolean;
  isServiceAccount: boolean;
  directoryPersonId?: string;
  confidence: number;
  matchType: 'exact_email' | 'alias' | 'service_account' | 'heuristic' | 'none';
  reasons: string[];
}

export class IdentityMatcher {
  private directory: DirectoryPersonRecord[];
  private emailIndex = new Map<string, DirectoryPersonRecord>();
  private aliasIndex = new Map<string, DirectoryPersonRecord>();

  constructor(directory: DirectoryPersonRecord[] = []) {
    this.directory = directory;
    this.buildIndices();
  }

  public updateDirectory(directory: DirectoryPersonRecord[]): void {
    this.directory = directory;
    this.buildIndices();
  }

  private buildIndices(): void {
    this.emailIndex.clear();
    this.aliasIndex.clear();

    for (const person of this.directory) {
      const normalizedPrimary = IdentityMatcher.normalizeEmail(person.primaryEmail);
      if (normalizedPrimary) {
        this.emailIndex.set(normalizedPrimary, person);
      }

      if (person.aliases) {
        for (const alias of person.aliases) {
          const normalizedAlias = IdentityMatcher.normalizeEmail(alias);
          if (normalizedAlias) {
            this.aliasIndex.set(normalizedAlias, person);
          }
        }
      }
    }
  }

  /**
   * Evaluates an external candidate account against directory and service patterns.
   */
  public match(candidate: MatchCandidate): MatchResult {
    const rawEmail = candidate.email || '';
    const normalizedEmail = IdentityMatcher.normalizeEmail(rawEmail);

    // 1. Service Account Heuristic Check
    if (IdentityMatcher.isServiceAccountPattern(rawEmail, candidate.displayName)) {
      return {
        candidate,
        matched: true,
        isServiceAccount: true,
        confidence: 1.0,
        matchType: 'service_account',
        reasons: ['Matched known service/automation account heuristics (svc-*, bot-*, automation)'],
      };
    }

    if (!normalizedEmail) {
      return {
        candidate,
        matched: false,
        isServiceAccount: false,
        confidence: 0,
        matchType: 'none',
        reasons: ['No valid email provided for account resolution'],
      };
    }

    // 2. Direct Primary Email Match (Rule 1, Confidence 1.0)
    const directMatch = this.emailIndex.get(normalizedEmail);
    if (directMatch) {
      return {
        candidate,
        matched: true,
        isServiceAccount: false,
        directoryPersonId: directMatch.id,
        confidence: 1.0,
        matchType: 'exact_email',
        reasons: [`Matched primary directory email: ${directMatch.primaryEmail}`],
      };
    }

    // 3. Alias & Secondary Email Match (Rule 2, Confidence 0.95)
    const aliasMatch = this.aliasIndex.get(normalizedEmail);
    if (aliasMatch) {
      return {
        candidate,
        matched: true,
        isServiceAccount: false,
        directoryPersonId: aliasMatch.id,
        confidence: 0.95,
        matchType: 'alias',
        reasons: [`Matched confirmed corporate alias for ${aliasMatch.displayName}`],
      };
    }

    // 4. Name / Username Heuristic Match (Rule 3, Confidence 0.85)
    const userPart = normalizedEmail.split('@')[0];
    for (const person of this.directory) {
      const dirUser = person.primaryEmail.split('@')[0].toLowerCase();
      if (userPart && dirUser && (userPart === dirUser || userPart.replace('.', '') === dirUser.replace('.', ''))) {
        return {
          candidate,
          matched: true,
          isServiceAccount: false,
          directoryPersonId: person.id,
          confidence: 0.85,
          matchType: 'heuristic',
          reasons: [`Matched username format pattern with ${person.primaryEmail}`],
        };
      }
    }

    // 5. Unmatched human candidate (routes to identity_queue)
    return {
      candidate,
      matched: false,
      isServiceAccount: false,
      confidence: 0,
      matchType: 'none',
      reasons: ['No matching directory person or service account pattern identified'],
    };
  }

  /**
   * Normalizes an email address:
   * - Trims whitespace
   * - Converts to lower-case
   * - Removes plus-tagging (e.g. user+tag@domain.com -> user@domain.com)
   */
  public static normalizeEmail(email: string): string {
    if (!email) return '';
    let cleaned = email.trim().toLowerCase();
    const atIndex = cleaned.indexOf('@');
    if (atIndex === -1) return cleaned;

    const localPart = cleaned.substring(0, atIndex);
    const domainPart = cleaned.substring(atIndex + 1);

    // Strip plus sub-addressing (e.g. omar+billing -> omar)
    const plusIndex = localPart.indexOf('+');
    const strippedLocal = plusIndex !== -1 ? localPart.substring(0, plusIndex) : localPart;

    return `${strippedLocal}@${domainPart}`;
  }

  /**
   * Identifies non-human service accounts based on established patterns:
   * - Prefixes: svc-, service-, bot-, daemon-, system-, no-reply-, api-, infra-, cron-, data-
   * - Suffixes: -svc, -bot, -automation, -service, -daemon
   * - Service domains or keywords
   */
  public static isServiceAccountPattern(email: string, displayName?: string): boolean {
    const textToCheck = `${email || ''} ${displayName || ''}`.trim().toLowerCase();
    if (!textToCheck) return false;

    const serviceRegex =
      /\b(svc[-_.]|service[-_.]|bot[-_.]|daemon[-_.]|system[-_.]|no-?reply[-_.]|api[-_.]|infra[-_.]|cron[-_.]|data[-_.])/i;
    const suffixRegex =
      /[-_.](svc|bot|automation|service|daemon)\b/i;
    const standaloneKeywordRegex =
      /\b(no-reply|noreply|service_worker|system-automation)\b/i;

    if (serviceRegex.test(textToCheck)) return true;
    if (suffixRegex.test(textToCheck)) return true;
    if (standaloneKeywordRegex.test(textToCheck)) return true;

    return false;
  }
}
