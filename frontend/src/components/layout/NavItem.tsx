"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

export function NavItem({ href, label, icon: Icon, count }: NavItemProps) {
  const active = usePathname().startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active ? "bg-brand-soft font-medium text-ink" : "text-ink/80 hover:bg-surface",
      )}
    >
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-muted">{count}</span>}
    </Link>
  );
}