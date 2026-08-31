import Link from 'next/link';

export default function Sidebar() {
  return (
    <nav className="w-64 bg-gray-900 text-white h-screen p-4 flex flex-col">
      <h2 className="font-bold text-xl mb-6">Arcturus</h2>
      <ul className="space-y-4 flex-1">
        <li><Link href="/experiments" className="hover:text-blue-400">Experiments</Link></li>
        <li><Link href="/scenarios" className="hover:text-blue-400">Scenarios</Link></li>
        <li><Link href="/workforce" className="hover:text-blue-400">Workforce</Link></li>
        <li><Link href="/workflows" className="hover:text-blue-400">Workflows</Link></li>
        <li><Link href="/runtime" className="hover:text-blue-400">Runtime</Link></li>
        <li><Link href="/evidence" className="hover:text-blue-400">Evidence</Link></li>
        <li><Link href="/validation" className="hover:text-blue-400">Validation</Link></li>
        <li><Link href="/intelligence" className="hover:text-blue-400">Intelligence</Link></li>
      </ul>
    </nav>
  );
}