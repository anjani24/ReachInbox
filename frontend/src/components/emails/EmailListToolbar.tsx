import { ListFilter, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/cn";

interface ToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function EmailListToolbar({ search, onSearchChange, onRefresh, refreshing }: ToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <label className="flex flex-1 items-center gap-2 rounded-full bg-surface px-4 py-2">
        <Search className="size-4 text-muted" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>

      <button className="rounded-lg p-2 text-muted hover:bg-surface hover:text-ink" title="Filter">
        <ListFilter className="size-4" />
      </button>

      <button
        onClick={onRefresh}
        className="rounded-lg p-2 text-muted hover:bg-surface hover:text-ink"
        title="Refresh"
      >
        <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
      </button>
    </div>
  );
}