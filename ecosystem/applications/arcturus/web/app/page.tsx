import Sidebar from './sidebar';

export default function Home() {
  return (
    <div className="flex min-h-screen bg-gray-100 text-black">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold">Arcturus Simulation Platform</h1>
        <p className="mt-4">Welcome to the Dashboard. Please select a module from the left menu.</p>
      </main>
    </div>
  );
}