import { redirect } from 'next/navigation';

// Ask OBA moved to the home page; old /ask?q=… links and bookmarks still work.
export default async function AskRedirect({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] : q;
  redirect(query ? `/?q=${encodeURIComponent(query)}` : '/');
}
