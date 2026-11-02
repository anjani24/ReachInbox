"use client";

import Link from "next/link";
import { Clock, Send } from "lucide-react";
import { useEmailCounts } from "@/hooks/useEmails";
import { buttonClasses } from "@/components/ui/Button";
import { UserMenu } from "./UserMenu";
import { NavItem } from "./NavItem";

export function Sidebar() {
  const { data: counts } = useEmailCounts();

  return (
    <aside className="flex h-screen w-[250px] shrink-0 flex-col gap-4 border-r border-line pb-2 pl-2 pr-4 pt-5">
      <Link href="/dashboard" className="px-2 font-display text-[28px] font-bold leading-none tracking-tight">
        ONB
      </Link>

      <UserMenu />

      <Link href="/compose" className={buttonClasses("outline", "w-full rounded-full py-2.5")}>
        Compose
      </Link>

      <nav className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted">Core</p>
        <NavItem href="/dashboard/scheduled" label="Scheduled" icon={Clock} count={counts?.scheduled} />
        <NavItem href="/dashboard/sent" label="Sent" icon={Send} count={counts?.sent} />
      </nav>
    </aside>
  );
}