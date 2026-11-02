"use client";

import { useCallback, useState } from "react";
import { ChevronDown, LogOut, MessageSquare, Send, Unplug } from "lucide-react";
import { useLogout, useMe } from "@/hooks/useAuth";
import { SLACK_CONNECT_URL, useSlackDisconnect, useSlackTest } from "@/hooks/useSlack";
import { useClickOutside } from "@/hooks/useClickOutside";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";

const itemClasses =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface disabled:opacity-60";

export function UserMenu() {
  const { data: user } = useMe();
  const logout = useLogout();
  const slackTest = useSlackTest();
  const slackDisconnect = useSlackDisconnect();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside<HTMLDivElement>(close);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-xl bg-surface p-2.5 text-left hover:brightness-[0.98]"
      >
        <Avatar src={user.avatarUrl} name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        <ChevronDown className={`size-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-line bg-white p-1 shadow-lg">
          {user.slackAvailable && (
            <>
              {user.slackConnected ? (
                <>
                  <p className="px-3 pb-1 pt-2 text-xs text-muted">
                    Slack connected{user.slackChannel ? ` · ${user.slackChannel}` : ""}
                  </p>
                  <button onClick={() => slackTest.mutate()} disabled={slackTest.isPending} className={itemClasses}>
                    {slackTest.isPending ? <Spinner className="size-4" /> : <Send className="size-4" />}
                    Send test alert
                  </button>
                  <button onClick={() => slackDisconnect.mutate()} disabled={slackDisconnect.isPending} className={itemClasses}>
                    {slackDisconnect.isPending ? <Spinner className="size-4" /> : <Unplug className="size-4" />}
                    Disconnect Slack
                  </button>
                </>
              ) : (
                <a href={SLACK_CONNECT_URL} className={itemClasses}>
                  <MessageSquare className="size-4" />
                  Connect Slack
                </a>
              )}
              <div className="my-1 h-px bg-line" />
            </>
          )}

          <button onClick={() => logout.mutate()} disabled={logout.isPending} className={`${itemClasses} text-red-600`}>
            {logout.isPending ? <Spinner className="size-4" /> : <LogOut className="size-4" />}
            Logout
          </button>
        </div>
      )}
    </div>
  );
}