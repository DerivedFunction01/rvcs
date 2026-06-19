import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, User } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

export function FullGuestSelectionDialog({
    open,
    onOpenChange,
    title,
    guests,
    selectedIds,
    onToggle,
    onSelectAll,
    onClearAll,
    globalGuestPalette,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    guests: any[];
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
    onSelectAll: () => void;
    onClearAll: () => void;
    globalGuestPalette: string[];
}) {
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    useEffect(() => {
        if (open) {
            setQuery("");
            setDebouncedQuery("");
        }
    }, [open]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 250);
        return () => clearTimeout(timer);
    }, [query]);

    const filtered = useMemo(() => {
        const q = debouncedQuery.trim().toLowerCase();
        return guests.filter((g) => (g.alias || `Guest ${g.number}`).toLowerCase().includes(q));
    }, [guests, debouncedQuery]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[95vh] flex flex-col overflow-hidden">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="text-lg md:text-xl">{title}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search guests..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-9 text-sm h-10 md:h-11"
                        />
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={onSelectAll} className="h-10 md:h-11 px-4 text-sm">Select All</Button>
                        <Button variant="outline" size="sm" onClick={onClearAll} className="h-10 md:h-11 px-4 text-sm text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">Clear All</Button>
                    </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 mt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-2">
                        {filtered.map((g) => {
                            const isVisible = selectedIds.has(g.id);
                            const originalIdx = guests.findIndex((orig) => orig.id === g.id);
                            return (
                                <button
                                    key={g.id}
                                    onClick={() => onToggle(g.id)}
                                    className={`flex items-center gap-3 px-4 py-3 md:px-5 md:py-4 border rounded-xl text-left text-sm transition-all min-h-14 md:min-h-16 ${isVisible
                                            ? "border-primary bg-primary/5 font-medium shadow-sm"
                                            : "border-border bg-card opacity-60 hover:opacity-100 hover:bg-accent"
                                        }`}
                                >
                                    <div
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{ background: globalGuestPalette[originalIdx % Math.max(1, globalGuestPalette.length)] }}
                                    />
                                    <span className="truncate flex-1">
                                        {g.alias || `Guest ${g.number}`}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="pt-4 border-t mt-auto shrink-0">
                    <Button className="w-full h-12 text-sm md:text-base" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function GuestFilterDialog({
    open,
    onOpenChange,
    guests,
    visibleAssignees,
    setVisibleAssignees,
    visiblePayers,
    setVisiblePayers,
    guestFilterOp,
    setGuestFilterOp,
    globalGuestPalette,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    guests: any[];
    visibleAssignees: Set<string>;
    setVisibleAssignees: (guests: Set<string>) => void;
    visiblePayers: Set<string>;
    setVisiblePayers: (guests: Set<string>) => void;
    guestFilterOp: "AND" | "OR";
    setGuestFilterOp: (v: "AND" | "OR") => void;
    globalGuestPalette: string[];
}) {
    const MAX_VISIBLE = 11;
    const assigneesToShow = guests.slice(0, MAX_VISIBLE);
    const hasMoreAssignees = guests.length > MAX_VISIBLE;

    const payersToShow = guests.slice(0, MAX_VISIBLE);
    const hasMorePayers = guests.length > MAX_VISIBLE;

    const [moreAssigneesOpen, setMoreAssigneesOpen] = useState(false);
    const [morePayersOpen, setMorePayersOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"assignees" | "payers">("assignees");

    const [localAssignees, setLocalAssignees] = useState<Set<string>>(visibleAssignees);
    const [localPayers, setLocalPayers] = useState<Set<string>>(visiblePayers);

    useEffect(() => {
        if (open) {
            setLocalAssignees(visibleAssignees);
            setLocalPayers(visiblePayers);
        }
    }, [open]);

    useEffect(() => {
        const timer = setTimeout(() => setVisibleAssignees(localAssignees), 250);
        return () => clearTimeout(timer);
    }, [localAssignees, setVisibleAssignees]);

    useEffect(() => {
        const timer = setTimeout(() => setVisiblePayers(localPayers), 250);
        return () => clearTimeout(timer);
    }, [localPayers, setVisiblePayers]);

    const renderAssignees = (keyPrefix: string) => (
        <>
                <div className="flex items-center justify-between sticky top-0 bg-background z-10 py-1 pb-2">
                <span className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider select-none">
                    Assignees
                </span>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 md:h-10 min-w-14 md:min-w-16 px-3 md:px-4 text-xs md:text-sm font-semibold text-primary"
                        onClick={() => setLocalAssignees(new Set(guests.map((g) => g.id)))}
                    >
                        All
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 md:h-10 min-w-14 md:min-w-16 px-3 md:px-4 text-xs md:text-sm font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setLocalAssignees(new Set())}
                    >
                        Clear
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 landscape:sm:grid-cols-2 gap-3 pb-2">
                {assigneesToShow.map((g, idx) => {
                    const isVisible = localAssignees.has(g.id);
                    return (
                        <button
                            key={`${keyPrefix}-${g.id}`}
                            onClick={() =>
                                setLocalAssignees((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(g.id)) next.delete(g.id);
                                    else next.add(g.id);
                                    return next;
                                })
                            }
                            className={`flex items-center gap-3 px-4 py-3 md:px-5 md:py-4 border rounded-xl text-left text-sm transition-all min-h-14 md:min-h-16 ${isVisible
                                    ? "border-primary bg-primary/5 font-medium shadow-sm"
                                    : "border-border bg-card opacity-60 hover:opacity-100 hover:bg-accent"
                                }`}
                        >
                            <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ background: globalGuestPalette[idx % Math.max(1, globalGuestPalette.length)] }}
                            />
                            <span className="truncate flex-1">
                                {g.alias || `Guest ${g.number}`}
                            </span>
                        </button>
                    );
                })}
                {hasMoreAssignees && (
                    <button
                        onClick={() => setMoreAssigneesOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 md:px-5 md:py-4 border border-dashed rounded-xl text-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-all min-h-14 md:min-h-16"
                    >
                        View {guests.length - MAX_VISIBLE} more...
                    </button>
                )}
            </div>
        </>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl w-[95vw] landscape:sm:max-w-6xl landscape:md:max-w-7xl max-h-[95vh] landscape:max-h-[95vh] landscape:overflow-hidden flex flex-col p-6">
                <div className="flex flex-col landscape:flex-row gap-4 landscape:gap-6 flex-1 min-h-0 landscape:overflow-hidden">

                    {/* Left Column */}
                    <div className="flex flex-col gap-3 flex-1 min-w-0 min-h-0 landscape:overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
                                <User className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                Filter by Guest
                            </DialogTitle>
                            <DialogDescription className="text-sm md:text-base">
                                Select which assignees and payers to show on the active check.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 min-h-0 flex flex-col mt-2 landscape:hidden landscape:md:flex">
                            {renderAssignees('left')}
                        </div>

                        <div className="hidden landscape:flex flex-col gap-3 pt-4 mt-auto w-full border-t">
                            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
                                <span className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider select-none">
                                    Combination
                                </span>
                                <div className="flex bg-background border rounded-lg p-1 w-full lg:w-auto">
                                    <Button
                                        variant={guestFilterOp === "OR" ? "secondary" : "ghost"}
                                        size="sm"
                                        className="h-9 md:h-10 text-xs md:text-sm px-3 md:px-4 flex-1 lg:flex-none"
                                        onClick={() => setGuestFilterOp("OR")}
                                    >
                                        ANY
                                    </Button>
                                    <Button
                                        variant={guestFilterOp === "AND" ? "secondary" : "ghost"}
                                        size="sm"
                                        className="h-9 md:h-10 text-xs md:text-sm px-3 md:px-4 flex-1 lg:flex-none"
                                        onClick={() => setGuestFilterOp("AND")}
                                    >
                                        ALL (AND)
                                    </Button>
                                </div>
                            </div>
                            <Button className="w-full h-11 md:h-12 text-sm md:text-base" onClick={() => onOpenChange(false)}>
                                Done
                            </Button>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="shrink-0 landscape:w-96 landscape:md:w-[30rem] flex flex-col min-h-0 landscape:mt-10 landscape:border-l landscape:pl-6 border-t landscape:border-t-0 pt-4 landscape:pt-0">
                        <div className="hidden landscape:flex landscape:md:hidden bg-muted/50 p-1 rounded-lg gap-1 mb-3 shrink-0">
                            <Button
                                variant={activeTab === "assignees" ? "default" : "ghost"}
                                size="sm"
                                className="flex-1 h-10 md:h-11 text-sm md:text-base"
                                onClick={() => setActiveTab("assignees")}
                            >
                                Assignees
                            </Button>
                            <Button
                                variant={activeTab === "payers" ? "default" : "ghost"}
                                size="sm"
                                className="flex-1 h-10 md:h-11 text-sm md:text-base"
                                onClick={() => setActiveTab("payers")}
                            >
                                Payers
                            </Button>
                        </div>
                        <div className={`flex-1 min-h-0 flex-col overflow-y-auto hidden ${activeTab === 'assignees' ? 'landscape:flex landscape:md:hidden' : 'hidden'}`}>
                            {renderAssignees('right')}
                        </div>
                        <div className={`flex-1 min-h-0 flex flex-col overflow-y-auto ${activeTab === 'assignees' ? 'landscape:hidden landscape:md:flex' : ''}`}>
                            <div className="flex items-center justify-between sticky top-0 bg-background z-10 py-1 pb-2">
                                <span className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider select-none">
                                    Payers
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 md:h-10 min-w-14 md:min-w-16 px-3 md:px-4 text-xs md:text-sm font-semibold text-primary"
                                        onClick={() => setLocalPayers(new Set(guests.map((g) => g.id)))}
                                    >
                                        All
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 md:h-10 min-w-14 md:min-w-16 px-3 md:px-4 text-xs md:text-sm font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => setLocalPayers(new Set())}
                                    >
                                        Clear
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 landscape:sm:grid-cols-2 gap-3 pb-2">
                                {payersToShow.map((g, idx) => {
                                    const isVisible = localPayers.has(g.id);
                                    return (
                                        <button
                                            key={`p-${g.id}`}
                                            onClick={() =>
                                                setLocalPayers((prev) => {
                                                    const next = new Set(prev);
                                                    if (next.has(g.id)) next.delete(g.id);
                                                    else next.add(g.id);
                                                    return next;
                                                })
                                            }
                                            className={`flex items-center gap-3 px-4 py-3 md:px-5 md:py-4 border rounded-xl text-left text-sm transition-all min-h-14 md:min-h-16 ${isVisible
                                                    ? "border-primary bg-primary/5 font-medium shadow-sm"
                                                    : "border-border bg-card opacity-60 hover:opacity-100 hover:bg-accent"
                                                }`}
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{ background: globalGuestPalette[idx % Math.max(1, globalGuestPalette.length)] }}
                                            />
                                            <span className="truncate flex-1">
                                                {g.alias || `Guest ${g.number}`}
                                            </span>
                                        </button>
                                    );
                                })}
                                {hasMorePayers && (
                                    <button
                                        onClick={() => setMorePayersOpen(true)}
                                        className="flex items-center justify-center gap-2 px-4 py-3 md:px-5 md:py-4 border border-dashed rounded-xl text-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-all min-h-14 md:min-h-16"
                                    >
                                        View {guests.length - MAX_VISIBLE} more...
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Portrait Footer */}
                <div className="flex flex-col gap-4 pt-4 mt-2 w-full landscape:hidden border-t shrink-0">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider select-none">
                            Combination
                        </span>
                        <div className="flex bg-background border rounded-lg p-1 w-full">
                            <Button
                                variant={guestFilterOp === "OR" ? "secondary" : "ghost"}
                                size="sm"
                                className="h-10 md:h-11 text-xs md:text-sm px-3 md:px-4 flex-1"
                                onClick={() => setGuestFilterOp("OR")}
                            >
                                ANY
                            </Button>
                            <Button
                                variant={guestFilterOp === "AND" ? "secondary" : "ghost"}
                                size="sm"
                                className="h-10 md:h-11 text-xs md:text-sm px-3 md:px-4 flex-1"
                                onClick={() => setGuestFilterOp("AND")}
                            >
                                ALL (AND)
                            </Button>
                        </div>
                    </div>
                    <Button className="w-full h-12 md:h-14 text-sm md:text-base" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </div>

                <FullGuestSelectionDialog
                    open={moreAssigneesOpen}
                    onOpenChange={setMoreAssigneesOpen}
                    title="Select Assignees"
                    guests={guests}
                    selectedIds={localAssignees}
                    onToggle={(id) => {
                        setLocalAssignees((prev) => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                        });
                    }}
                    onSelectAll={() => setLocalAssignees(new Set(guests.map(g => g.id)))}
                    onClearAll={() => setLocalAssignees(new Set())}
                    globalGuestPalette={globalGuestPalette}
                />

                <FullGuestSelectionDialog
                    open={morePayersOpen}
                    onOpenChange={setMorePayersOpen}
                    title="Select Payers"
                    guests={guests}
                    selectedIds={localPayers}
                    onToggle={(id) => {
                        setLocalPayers((prev) => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                        });
                    }}
                    onSelectAll={() => setLocalPayers(new Set(guests.map(g => g.id)))}
                    onClearAll={() => setLocalPayers(new Set())}
                    globalGuestPalette={globalGuestPalette}
                />
            </DialogContent>
        </Dialog>
    );
}
