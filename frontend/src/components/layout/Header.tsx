export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div>
          <h1 className="text-2xl font-bold">
            GrowEasy CSV Importer
          </h1>

          <p className="text-sm text-slate-500">
            AI-powered CRM Lead Import
          </p>
        </div>
      </div>
    </header>
  );
}