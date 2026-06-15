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
import { usePreferencesStore } from "@/store/preferences-store";
import { ChevronsUpDown, Clock, Layers, LayoutList, User } from "lucide-react";
import { useState } from "react";
import { GuestFilterDialog } from "../dialogs/filter-guest-dialog";



interface ActiveCheckActionFilterBarProps {
  activeBranch: string;
  isViewingHistory: boolean;
  guests: any[];
  visibleAssignees: Set<string>;
  setVisibleAssignees: (guests: Set<string>) => void;
  visiblePayers: Set<string>;
  setVisiblePayers: (guests: Set<string>) => void;
  toggleAllCollapsed: () => void;
  hasCollapsedItems: boolean;
  hideCanceled: boolean;
  setHideCanceled: (hide: boolean) => void;
  canceledCount: number;
  detailLevel: ViewMode;
  setDetailLevel: (level: ViewMode) => void;
  guestFilterOp: "AND" | "OR";
  setGuestFilterOp: (v: "AND" | "OR") => void;
  isCompactMode: boolean;
  setIsCompactMode: (compact: boolean) => void;
}

export function ActiveCheckActionFilterBar({
  activeBranch,
  isViewingHistory,
  guests,
  visibleAssignees,
  setVisibleAssignees,
  visiblePayers,
  setVisiblePayers,
  toggleAllCollapsed,
  hasCollapsedItems,
  hideCanceled,
  setHideCanceled,
  canceledCount,
  detailLevel,
  setDetailLevel,
  guestFilterOp,
  setGuestFilterOp,
  isCompactMode,
  setIsCompactMode,
}: ActiveCheckActionFilterBarProps) {
  const globalGuestPalette = usePreferencesStore((state) => state.defaultPrefs.globalDepthColors) || ["#94a3b8"];
  const [guestFilterOpen, setGuestFilterOpen] = useState(false);

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

      <Button
        variant="outline"
        size="sm"
        className="h-6 text-[10px] gap-1 px-2 bg-background border hover:bg-accent"
        onClick={() => setGuestFilterOpen(true)}
      >
        <User className="w-3 h-3 text-muted-foreground" />
        <span>
        {(visibleAssignees.size === guests.length && visiblePayers.size === guests.length)
            ? "All Guests"
          : "Filtered Guests"}
        </span>
      </Button>
      
      <GuestFilterDialog
        open={guestFilterOpen}
        onOpenChange={setGuestFilterOpen}
        guests={guests}
        visibleAssignees={visibleAssignees}
        setVisibleAssignees={setVisibleAssignees}
        visiblePayers={visiblePayers}
        setVisiblePayers={setVisiblePayers}
        guestFilterOp={guestFilterOp}
        setGuestFilterOp={setGuestFilterOp}
        globalGuestPalette={globalGuestPalette}
      />

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
            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer transition-colors">
              <Checkbox
                checked={isCompactMode}
                onCheckedChange={(v) => setIsCompactMode(!!v)}
                className="w-3.5 h-3.5"
              />
              <span className="font-medium text-foreground">
                Compact view
              </span>
            </label>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
