import { NovidadesGate } from "@/features/novidades";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <TopBar />
      <main id="main-content" className="flex-1 px-4 pt-4 pb-24">
        {children}
      </main>
      <BottomNav />
      <NovidadesGate />
    </div>
  );
}
