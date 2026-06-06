"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useUser } from "../use-auth";
import { useIsAdmin } from "../use-is-admin";
import { signOutUser } from "@/shared/lib/supabase";
import { AvatarParticipante } from "@/shared/ui/avatar-participante";

function getDisplayName(user: User): string {
  const meta = user.user_metadata;
  if (typeof meta["full_name"] === "string" && meta["full_name"]) {
    return meta["full_name"];
  }
  if (typeof meta["name"] === "string" && meta["name"]) {
    return meta["name"];
  }
  return user.email ?? "Usuário";
}

function getAvatarUrl(user: User): string | null {
  const meta = user.user_metadata;
  if (typeof meta["avatar_url"] === "string") return meta["avatar_url"];
  if (typeof meta["picture"] === "string") return meta["picture"];
  return null;
}

/**
 * Menu de usuário na TopBar: avatar clicável que abre dropdown com
 * nome, badge de admin (quando aplicável) e botão de logout.
 * Fecha ao clicar fora ou pressionar Escape.
 */
export function UserMenu() {
  const user = useUser();
  const isAdmin = useIsAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleMousedown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleMousedown);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handleMousedown);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [isOpen]);

  if (!user) return null;

  const displayName = getDisplayName(user);
  const avatarUrl = getAvatarUrl(user);

  async function handleSignOut() {
    setIsOpen(false);
    await signOutUser();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Menu do usuário — ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="user-menu-dropdown"
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-full transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <AvatarParticipante nome={displayName} avatarUrl={avatarUrl} tamanho={34} />
      </button>

      {isOpen && (
        <div
          id="user-menu-dropdown"
          role="menu"
          className="absolute top-full right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-md"
        >
          {/* Cabeçalho com nome e badge admin */}
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            {isAdmin && (
              <span className="mt-1 inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold tracking-wide text-destructive-foreground uppercase">
                Admin
              </span>
            )}
          </div>

          {/* Ações */}
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
