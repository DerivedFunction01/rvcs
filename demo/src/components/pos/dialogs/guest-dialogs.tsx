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
import { Minus, Pencil, Plus, Search, User, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Add Guests
          </DialogTitle>
          <DialogDescription>
            Add one or more guests to the order. Guests are automatically
            numbered.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Number of guests to add
            </label>
            <div className="flex items-center gap-4 sm:gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 sm:h-8 sm:w-8 shrink-0"
                onClick={() => setCount(Math.max(1, count - 1))}
              >
                <Minus className="w-6 h-6 sm:w-3.5 sm:h-3.5" />
              </Button>
              <Input
                type="number"
                value={count}
                onChange={(e) =>
                  setCount(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="h-14 sm:h-8 w-24 sm:w-20 text-center text-xl sm:text-xs font-mono"
                min={1}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 sm:h-8 sm:w-8 shrink-0"
                onClick={() => setCount(count + 1)}
              >
                <Plus className="w-6 h-6 sm:w-3.5 sm:h-3.5" />
              </Button>
            </div>
          </div>
          {count === 1 && (
            <>
              <div className="space-y-1.5 mt-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Alias / Name (Optional)
                </label>
                <Input
                  autoFocus
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="e.g. John"
                  className="h-14 sm:h-9 text-base sm:text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter className="gap-3 sm:gap-2 flex-col sm:flex-row pt-2">
          <Button variant="outline" className="h-14 sm:h-10 text-base sm:text-sm w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="h-14 sm:h-10 text-base sm:text-sm w-full sm:w-auto" onClick={handleSubmit}>
            Add {count} Guest{count !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const getGuests = useVCSStore((s) => s.guests);
  const allocationsState = useVCSStore((s) => s.projectedState.allocations);
  const globalGuestPalette = usePreferencesStore((state) => state.defaultPrefs.globalDepthColors) || ["#94a3b8"];
  const guests = useMemo(() => getGuests(), [getGuests, allocationsState]);
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) => g.name.toLowerCase().includes(q));
  }, [guests, query]);

  const searchArea = (
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-3 top-4 sm:top-3.5 h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground" />
      <Input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search guests..."
        className="pl-10 sm:pl-9 h-14 sm:h-10 text-base sm:text-sm"
      />
    </div>
  );

  const actionButtons = (
    <>
      <Button variant="outline" className="h-14 sm:h-10 text-base sm:text-sm w-full sm:w-auto landscape:w-auto" onClick={() => onOpenChange(false)}>
        Close
      </Button>
      <Button
        className="h-14 sm:h-10 text-base sm:text-sm w-full sm:w-auto landscape:w-auto"
        onClick={() => {
          onOpenChange(false);
          onOpenAddGuest();
        }}
      >
        <UserPlus className="w-5 h-5 sm:w-3.5 sm:h-3.5 mr-2 sm:mr-1" /> Add Guest
      </Button>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Select Guest
          </DialogTitle>
          <DialogDescription>
            Choose a guest from the grid or add a new one if they are not
            listed.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col landscape:flex-row gap-3 sm:gap-2">
          {searchArea}
          <div className="hidden landscape:flex gap-2 shrink-0 flex-row">
            {actionButtons}
          </div>
        </div>
        <ScrollArea className="max-h-[52vh] pr-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No guests match "{query.trim()}".
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-2">
              {filtered.map((guest: any, idx: number) => (
                <div
                  key={guest.id}
                  onClick={() => {
                    onSelectPerson(guest.id);
                    onOpenChange(false);
                  }}
                  className={`relative group flex flex-col items-start gap-2 sm:gap-1 rounded-lg border p-4 sm:p-3 text-left transition-all hover:border-primary/50 hover:bg-accent/40 cursor-pointer min-h-24 sm:min-h-0 ${selectedPerson === guest.id ? "border-primary bg-primary/5" : "bg-card"}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className="w-3 h-3 sm:w-2.5 sm:h-2.5 rounded-full"
                      style={{ background: globalGuestPalette[idx % Math.max(1, globalGuestPalette.length)] }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 sm:h-6 sm:w-6 opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditGuest(guest);
                      }}
                    >
                      <Pencil className="h-5 w-5 sm:h-3 sm:w-3 text-muted-foreground hover:text-foreground" />
                    </Button>
                  </div>
                  <span className="w-full truncate text-base sm:text-sm font-semibold">
                    {guest.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="gap-3 sm:gap-2 flex-col sm:flex-row sm:justify-between pt-2 landscape:hidden">
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" /> Edit Guest
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Guest Name
            </label>
            <Input
              autoFocus
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder={`Guest name`}
              className="h-14 sm:h-9 text-base sm:text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter className="gap-3 sm:gap-2 flex-col sm:flex-row pt-2">
          <Button variant="outline" className="h-14 sm:h-10 text-base sm:text-sm w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="h-14 sm:h-10 text-base sm:text-sm w-full sm:w-auto" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
