/**
 * FOCUS ENGINE — scrolls the executive to the exact block they asked for.
 *
 * Resolution order, best evidence first:
 *   1. an explicit anchor:  [data-focus-id="..."]  or  #id
 *   2. a heading (h1–h4) whose text equals / starts with / contains the target
 *
 * Pages fetch their data in an effect, so the block usually does not exist yet
 * at the moment we navigate. `requestFocus` therefore retries on an interval
 * until the element appears or the budget runs out, rather than resolving once
 * and silently doing nothing.
 */

const RETRY_MS = 120;
const BUDGET_MS = 8000;
const HIGHLIGHT_MS = 2200;

/** Focus requested before the destination route finished mounting. */
let pending: { match: string; expires: number } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function normalize(s: string | null | undefined) {
  return (s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** The card/panel wrapper a heading sits in — that is what we highlight. */
function enclosingBlock(el: Element): HTMLElement {
  let node: HTMLElement | null = el as HTMLElement;
  for (let hops = 0; node && hops < 6; hops += 1) {
    if (node.classList?.contains('card') || node.tagName === 'SECTION' || node.tagName === 'ARTICLE') {
      return node;
    }
    node = node.parentElement;
  }
  return el as HTMLElement;
}

export function resolveElement(match: string): HTMLElement | null {
  const wanted = normalize(match);
  if (!wanted) return null;

  const anchored =
    document.querySelector<HTMLElement>(`[data-focus-id="${CSS.escape(match)}"]`) ??
    (/^[A-Za-z][\w-]*$/.test(match) ? document.getElementById(match) : null);
  if (anchored) return anchored;

  const headings = Array.from(
    document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, [data-section-title]'),
  );

  return (
    headings.find((h) => normalize(h.textContent) === wanted) ??
    headings.find((h) => normalize(h.textContent).startsWith(wanted)) ??
    headings.find((h) => normalize(h.textContent).includes(wanted)) ??
    null
  );
}

function applyFocus(el: HTMLElement) {
  const block = enclosingBlock(el);
  block.scrollIntoView({ behavior: 'smooth', block: 'center' });
  block.classList.remove('oba-focus-flash');
  // Force a reflow so the animation replays when the same block is picked twice.
  void block.offsetWidth;
  block.classList.add('oba-focus-flash');
  window.setTimeout(() => block.classList.remove('oba-focus-flash'), HIGHLIGHT_MS);
}

function stop() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  pending = null;
}

/**
 * Ask the focus engine to land on `match`. Safe to call before the destination
 * route has rendered — it keeps retrying for up to BUDGET_MS.
 */
export function requestFocus(match: string | undefined) {
  if (typeof window === 'undefined') return;
  stop();
  if (!match) {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    return;
  }

  pending = { match, expires: Date.now() + BUDGET_MS };

  const attempt = () => {
    if (!pending) return;
    if (Date.now() > pending.expires) {
      stop();
      return;
    }
    const el = resolveElement(pending.match);
    if (el) {
      stop();
      applyFocus(el);
    }
  };

  attempt();
  if (pending) timer = setInterval(attempt, RETRY_MS);
}

/** Cancel an in-flight focus — used when the executive navigates away. */
export function cancelFocus() {
  stop();
}
