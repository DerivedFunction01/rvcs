import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ViewMode } from "@/lib/pos/types";
import { GUEST_PALETTE } from "@/lib/pos/ui-utils";
import { ChevronsUpDown, Clock, Layers, LayoutList, User } from "lucide-react";

interface ActiveCheckActionFilterBarProps {
  activeBranch: string;
  isViewingHistory: boolean;
  guests: any[];
  visibleGuests: Set<string>;
  setVisibleGuests: (guests: Set<string>) => void;
  toggleAllCollapsed: () => void;
  hasCollapsedItems: boolean;
  hideCanceled: boolean;
  setHideCanceled: (hide: boolean) => void;
  canceledCount: number;
  detailLevel: ViewMode;
  setDetailLevel: (level: ViewMode) => void;
}

export function ActiveCheckActionFilterBar({
  activeBranch,
  isViewingHistory,
  guests,
  visibleGuests,
  setVisibleGuests,
  toggleAllCollapsed,
  hasCollapsedItems,
  hideCanceled,
  setHideCanceled,
  canceledCount,
  detailLevel,
  setDetailLevel,
}: ActiveCheckActionFilterBarProps) {
  return (
    <div className="flex items-center gap-2 pl-4 border-l border-primary/10">
      <Badge variant="secondary" className="text-[10px] h-6 flex items-center">
        <Layers className="w-2.5 h-2.5 mr-1" />
        {activeBranch}
      </Badge>

      {isViewingHistory && (
        <Badge
          variant="outline"
          className="text-[10px] h-6 flex items-center text-amber-600 border-amber-300 bg-amber-50"
        >
          <Clock className="w-2.5 h-2.5 mr-1" />
          Viewing history
        </Badge>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] gap-1 px-2 bg-background border hover:bg-accent"
          >
            <User className="w-3 h-3 text-muted-foreground" />
            <span>
              {visibleGuests.size === guests.length
                ? "All Guests"
                : visibleGuests.size === 0
                  ? "No Guests"
                  : `${visibleGuests.size}/${guests.length} Guests`}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                Filter Guests
              </span>
              <div className="flex gap-2">
                <Button
                  variant="link"
                  className="h-auto p-0 text-[10px] font-semibold text-primary"
                  onClick={() =>
                    setVisibleGuests(new Set(guests.map((g) => g.id)))
                  }
                >
                  Select All
                </Button>
                <Button
                  variant="link"
                  className="h-auto p-0 text-[10px] font-semibold text-destructive"
                  onClick={() => setVisibleGuests(new Set())}
                >
                  Clear All
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {guests.map((g, idx) => {
                const isVisible = visibleGuests.has(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() =>
                      setVisibleGuests(
                        (() => {
                          const next = new Set(visibleGuests);
                          if (next.has(g.id)) next.delete(g.id);
                          else next.add(g.id);
                          return next;
                        })(),
                      )
                    }
                    className={`flex items-center gap-1.5 px-2 py-1 border rounded-lg text-left text-xs transition-all ${
                      isVisible
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-border bg-card opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        GUEST_PALETTE[idx % GUEST_PALETTE.length]
                      }`}
                    />
                    <span className="truncate flex-1">
                      {g.alias || `Guest ${g.number}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:bg-accent"
            onClick={toggleAllCollapsed}
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {hasCollapsedItems ? "Expand all" : "Collapse all"}
        </TooltipContent>
      </Tooltip>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:bg-accent relative"
          >
            <LayoutList className="w-3.5 h-3.5" />
            {hideCanceled && canceledCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-3.5 min-w-3.5 flex items-center justify-center px-0.5 text-[7px] border-background"
              >
                {canceledCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 text-[10px]">
              Item Detail Level
            </p>
            {(Object.values(ViewMode)).map((level) => (
              <button
                key={level}
                onClick={() => setDetailLevel(level)}
                className={`w-full flex flex-col px-2 py-1.5 rounded transition-colors text-left ${
                  detailLevel === level
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                <span className="font-medium capitalize">{level}</span>
              </button>
            ))}
            <div className="my-1 border-t" />
            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer transition-colors">
              <Checkbox
                checked={hideCanceled}
                onCheckedChange={(v) => setHideCanceled(!!v)}
                className="w-3.5 h-3.5"
              />
              <span className="font-medium text-foreground">
                Hide voided items
              </span>
            </label>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
