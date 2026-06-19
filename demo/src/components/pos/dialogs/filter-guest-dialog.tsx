import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { GuestGridPicker } from "./guest-picker";

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
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[95vh] flex flex-col overflow-hidden">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="text-lg md:text-xl">{title}</DialogTitle>
                </DialogHeader>
                <GuestGridPicker
                    open={open}
                    items={guests.map((g) => ({
                        id: g.id,
                        label: g.alias || `Guest ${g.number ?? ""}`.trim(),
                        secondary: g.number != null ? `Guest ${g.number}` : undefined,
                    }))}
                    selectedIds={selectedIds}
                    onToggle={onToggle}
                    palette={globalGuestPalette}
                    searchPlaceholder="Search guests..."
                    emptyText="No guests match the current search."
                    showSelectAll
                    showClearAll
                    onSelectAll={onSelectAll}
                    onClearAll={onClearAll}
                    footer={
                        <Button className="w-full h-12 text-sm md:text-base" onClick={() => onOpenChange(false)}>
                            Done
                        </Button>
                    }
                />
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
        <GuestGridPicker
            open={open}
            items={assigneesToShow.map((g) => ({
                id: g.id,
                label: g.alias || `Guest ${g.number}`,
                secondary: `Guest ${g.number}`,
            }))}
            selectedIds={localAssignees}
            onToggle={(id) =>
                setLocalAssignees((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                })
            }
            palette={globalGuestPalette}
            searchPlaceholder="Search guests..."
            emptyText="No guests match the current search."
            showSelectAll
            showClearAll
            onSelectAll={() => setLocalAssignees(new Set(guests.map((g) => g.id)))}
            onClearAll={() => setLocalAssignees(new Set())}
            header={
                <span className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider select-none">
                    Assignees
                </span>
            }
            footer={hasMoreAssignees ? (
                <button
                    onClick={() => setMoreAssigneesOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground transition-all min-h-14 md:min-h-16 hover:bg-accent hover:text-foreground"
                >
                    View {guests.length - MAX_VISIBLE} more...
                </button>
            ) : undefined}
        />
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
                    <div className="shrink-0 landscape:w-96 landscape:md:w-120 flex flex-col min-h-0 landscape:mt-10 landscape:border-l landscape:pl-6 border-t landscape:border-t-0 pt-4 landscape:pt-0">
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
                            <GuestGridPicker
                                open={open}
                                items={payersToShow.map((g) => ({
                                    id: g.id,
                                    label: g.alias || `Guest ${g.number ?? ""}`.trim(),
                                    secondary: g.number != null ? `Guest ${g.number}` : undefined,
                                }))}
                                selectedIds={localPayers}
                                onToggle={(id) => {
                                    setLocalPayers((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(id)) next.delete(id);
                                        else next.add(id);
                                        return next;
                                    });
                                }}
                                palette={globalGuestPalette}
                                searchPlaceholder="Search guests..."
                                emptyText="No guests match the current search."
                                showSelectAll
                                showClearAll
                                onSelectAll={() => setLocalPayers(new Set(guests.map((g) => g.id)))}
                                onClearAll={() => setLocalPayers(new Set())}
                                header={
                                    <span className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider select-none">
                                        Payers
                                    </span>
                                }
                                footer={hasMorePayers ? (
                                    <button
                                        onClick={() => setMorePayersOpen(true)}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground transition-all min-h-14 md:min-h-16 hover:bg-accent hover:text-foreground"
                                    >
                                        View {guests.length - MAX_VISIBLE} more...
                                    </button>
                                ) : undefined}
                            />
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
