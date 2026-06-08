"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, Trophy, Gift, BookOpen, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useIsAdmin } from "@/features/auth";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/palpites", label: "Palpites", icon: Target },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/premiacao", label: "Premiação", icon: Gift },
  { href: "/regras", label: "Regras", icon: BookOpen },
];

const ADMIN_NAV_ITEM: NavItem = { href: "/admin", label: "Admin", icon: ShieldCheck };

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();

  const navItems: NavItem[] = isAdmin ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM] : BASE_NAV_ITEMS;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-brand-800" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
