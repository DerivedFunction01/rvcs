import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePreferencesStore } from "@/store/preferences-store";
import { useVCSStore } from "@/store/vcs-store";
import { Loader2, Minus, Pencil, Plus, Search, User, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NumberPadDialog } from "./number-pad-dialog";

export function AddGuestDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const getGuests = useVCSStore((s) => s.guests);
  const allocationsState = useVCSStore((s) => s.projectedState.allocations);
  const guests = useMemo(() => getGuests(), [getGuests, allocationsState]);
  const addGuestAction = useVCSStore((s) => s.addGuest);

  const [count, setCount] = useState(1);
  const [alias, setAlias] = useState("");
  const [numPadOpen, setNumPadOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setCount(1);
      setAlias("");
    }
  }, [open]);

  const handleSubmit = () => {
    const currentMax = guests.length;
    if (count === 1) {
      const a = alias.trim() || `Guest ${currentMax + 1}`;
      addGuestAction(a);
    } else {
      for (let i = 0; i < count; i++) {
        addGuestAction(`Guest ${currentMax + 1 + i}`);
      }
    }
    onOpenChange(false);
  };

  const actionButtons = (
    <>
      <Button variant="outline" className="flex-1 sm:flex-none h-14 sm:h-12 text-base" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button className="flex-1 sm:flex-none h-14 sm:h-12 text-base" onClick={handleSubmit}>
        Add {count} Guest{count !== 1 ? "s" : ""}
      </Button>
    </>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md landscape:sm:max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Add Guests
          </DialogTitle>
          <DialogDescription>
            Add one or more guests to the order. Guests are automatically
            numbered.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col landscape:flex-row gap-4 items-end py-2">
          <div className="flex flex-col landscape:flex-row gap-4 flex-1 min-w-0 w-full">
            <div className="space-y-1.5 shrink-0">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Number of guests to add
              </label>
              <div className="flex items-center gap-4 sm:gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 sm:h-12 sm:w-12 shrink-0"
                  onClick={() => setCount(Math.max(1, count - 1))}
                >
                  <Minus className="w-6 h-6 sm:w-5 sm:h-5" />
                </Button>
                <button
                  className="flex items-center justify-center h-14 sm:h-12 w-24 sm:w-24 text-center text-xl sm:text-lg font-mono border border-input rounded-md bg-background shadow-sm hover:bg-accent transition-colors"
                  onClick={() => setNumPadOpen(true)}
                >
                  {count}
                </button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 sm:h-12 sm:w-12 shrink-0"
                  onClick={() => setCount(count + 1)}
                >
                  <Plus className="w-6 h-6 sm:w-5 sm:h-5" />
                </Button>
              </div>
            </div>
            {count === 1 && (
              <div className="space-y-1.5 flex-1 min-w-0 w-full">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Alias / Name (Optional)
                </label>
                <Input
                  autoFocus
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="e.g. John"
                  className="h-14 sm:h-12 text-base"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                />
              </div>
            )}
          </div>
          <div className="hidden landscape:flex flex-row gap-2 shrink-0">
            {actionButtons}
          </div>
        </div>
        <DialogFooter className="gap-3 sm:gap-2 flex-row sm:flex-row pt-2 landscape:hidden w-full space-x-0 sm:space-x-0">
          {actionButtons}
        </DialogFooter>
      </DialogContent>
      </Dialog>
      {numPadOpen && (
        <NumberPadDialog
          open={numPadOpen}
          onOpenChange={setNumPadOpen}
          title="Number of Guests"
          description="Set the number of guests to add"
          initialValue={count}
          min={1}
          increment={1}
          onConfirm={(val) => setCount(val)}
        />
      )}
    </>
  );
}

export function GuestPickerDialog({
  open,
  onOpenChange,
  selectedPerson,
  onSelectPerson,
  onEditGuest,
  onOpenAddGuest,
}: any) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const getGuests = useVCSStore((s) => s.guests);
  const allocationsState = useVCSStore((s) => s.projectedState.allocations);
  const globalGuestPalette = usePreferencesStore((state) => state.defaultPrefs.globalDepthColors) || ["#94a3b8"];
  const guests = useMemo(() => getGuests(), [getGuests, allocationsState]);

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
    if (!q) return guests;
    return guests.filter((g) => g.name.toLowerCase().includes(q));
  }, [guests, debouncedQuery]);

  const searchArea = (
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-3 top-4 sm:top-3.5 h-5 w-5 sm:h-5 sm:w-5 text-muted-foreground" />
      <Input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search guests..."
        className="pl-10 pr-10 sm:pl-10 h-14 sm:h-12 text-base"
      />
      {query !== debouncedQuery && (
        <Loader2 className="absolute right-3 top-4 sm:top-3.5 h-5 w-5 sm:h-5 sm:w-5 animate-spin text-muted-foreground" />
      )}
    </div>
  );

  const actionButtons = (
    <>
      <Button variant="outline" className="flex-1 sm:flex-none h-14 sm:h-12 text-base" onClick={() => onOpenChange(false)}>
        Close
      </Button>
      <Button
        className="flex-1 sm:flex-none h-14 sm:h-12 text-base"
        onClick={() => {
          onOpenChange(false);
          onOpenAddGuest();
        }}
      >
        <UserPlus className="w-5 h-5 sm:w-4 sm:h-4 mr-2 sm:mr-1.5" /> Add Guest
      </Button>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl landscape:sm:max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Select Guest
          </DialogTitle>
          <DialogDescription>
            Choose a guest from the grid or add a new one if they are not
            listed.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col landscape:flex-row gap-4 landscape:gap-6 flex-1 min-h-0">
          <div className="flex flex-col gap-3 shrink-0 landscape:w-70">
            {searchArea}
            <div className="hidden landscape:flex flex-row gap-2 mt-auto pt-2 w-full">
              {actionButtons}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No guests match "{query.trim()}".
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-3">
              {filtered.map((guest: any, idx: number) => (
                <div
                  key={guest.id}
                  onClick={() => {
                    onSelectPerson(guest.id);
                    onOpenChange(false);
                  }}
                  className={`relative group flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/40 cursor-pointer min-h-24 ${selectedPerson === guest.id ? "border-primary bg-primary/5" : "bg-card"}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: globalGuestPalette[idx % Math.max(1, globalGuestPalette.length)] }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 sm:h-8 sm:w-8 opacity-100 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditGuest(guest);
                      }}
                    >
                      <Pencil className="h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground sm:hover:text-foreground" />
                    </Button>
                  </div>
                  <span className="w-full truncate text-base font-semibold">
                    {guest.name}
                  </span>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
        <DialogFooter className="gap-3 sm:gap-2 flex-row sm:flex-row pt-2 landscape:hidden w-full space-x-0 sm:space-x-0 mt-2 shrink-0">
          {actionButtons}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditGuestDialog({ open, onOpenChange, guestToEdit }: any) {
  const [alias, setAlias] = useState("");
  const updateGuest = useVCSStore((s) => s.updateGuest);
  useEffect(() => {
    if (open && guestToEdit) {
      setAlias(guestToEdit.name || "");
    }
  }, [open, guestToEdit]);
  const handleSave = () => {
    updateGuest(guestToEdit.id, alias);
    onOpenChange(false);
  };


  const actionButtons = (
    <>
      <Button variant="outline" className="flex-1 sm:flex-none h-14 sm:h-12 text-base" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button className="flex-1 sm:flex-none h-14 sm:h-12 text-base" onClick={handleSave}>
        Save
      </Button>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md landscape:sm:max-w-xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" /> Edit Guest
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col landscape:flex-row gap-4 items-end py-2">
          <div className="space-y-2 flex-1 min-w-0 w-full">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Guest Name
            </label>
            <Input
              autoFocus
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder={`Guest name`}
              className="h-14 sm:h-12 text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
          </div>
          <div className="hidden landscape:flex flex-row gap-2 shrink-0">
            {actionButtons}
          </div>
        </div>
        <DialogFooter className="gap-3 sm:gap-2 flex-row sm:flex-row pt-2 landscape:hidden w-full space-x-0 sm:space-x-0">
          {actionButtons}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

}
