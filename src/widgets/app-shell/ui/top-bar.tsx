import { Trophy } from "lucide-react";
import { UserMenu } from "@/features/auth";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-white">
            <Trophy className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-foreground">
            Resenha - Bolão da Copa
          </span>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
