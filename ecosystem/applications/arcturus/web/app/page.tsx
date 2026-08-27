import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-lg shadow border">
        <h1 className="text-3xl font-bold text-gray-900">Arcturus Simulation Platform</h1>
        <p className="mt-2 text-gray-600">
          Welcome to the Synthetic Enterprise Digital Twin & Simulation Engine.
        </p>
        <div className="mt-6 flex space-x-4">
          <Link
            href="/experiments"
            className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 font-medium transition"
          >
            Go to Experiments &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}