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
import { usePreferencesStore } from "@/store/preferences-store";
import { useVCSStore } from "@/store/vcs-store";
import { Minus, Pencil, Plus, User, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NumberPadDialog } from "./number-pad-dialog";
import { GuestGridPicker } from "./guest-picker";

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

  const handleSubmitMultiplier = () => {
    const currentMax = guests.length;
    const a = alias.trim() || `Guest ${currentMax + 1}`;
    addGuestAction(a, count);
    onOpenChange(false);
  };

  const handleSubmitMany = () => {
    const currentMax = guests.length;
    for (let i = 0; i < count; i++) {
      addGuestAction(`Guest ${currentMax + 1 + i}`, 1);
    }
    onOpenChange(false);
  };

  const showSeparateGuestCountAction = count > 1;

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
                Guest count / multiplier
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
                    if (e.key === "Enter") handleSubmitMultiplier();
                  }}
                />
              </div>
            )}
          </div>
          <div className="hidden landscape:flex flex-row gap-2 shrink-0">
            <Button variant="outline" className="flex-1 sm:flex-none h-14 sm:h-12 text-base" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {showSeparateGuestCountAction && (
              <Button variant="outline" className="flex-1 sm:flex-none h-14 sm:h-12 text-base" onClick={handleSubmitMany}>
                Add {count} Guest{count !== 1 ? "s" : ""}
              </Button>
            )}
            <Button className="flex-1 sm:flex-none h-14 sm:h-12 text-base" onClick={handleSubmitMultiplier}>
              Add Guest x{count}
            </Button>
          </div>
        </div>
        <DialogFooter className="gap-3 sm:gap-2 flex-col sm:flex-row pt-2 landscape:hidden w-full space-x-0 sm:space-x-0">
          <Button variant="outline" className="flex-1 h-14 sm:h-12 text-base" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {showSeparateGuestCountAction && (
            <Button variant="outline" className="flex-1 h-14 sm:h-12 text-base" onClick={handleSubmitMany}>
              Add {count} Guest{count !== 1 ? "s" : ""}
            </Button>
          )}
          <Button className="flex-1 h-14 sm:h-12 text-base" onClick={handleSubmitMultiplier}>
            Add Guest x{count}
          </Button>
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
  const getGuests = useVCSStore((s) => s.guests);
  const allocationsState = useVCSStore((s) => s.projectedState.allocations);
  const globalGuestPalette = usePreferencesStore((state) => state.defaultPrefs.globalDepthColors) || ["#94a3b8"];
  const guests = useMemo(() => getGuests(), [getGuests, allocationsState]);

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
        <GuestGridPicker
          open={open}
          items={guests.map((guest: any) => ({
            id: guest.id,
            label: guest.name || guest.alias || `Guest ${guest.number ?? ""}`.trim(),
            secondary: guest.alias || (guest.number != null ? `Guest ${guest.number}` : undefined),
          }))}
          selectedIds={new Set([selectedPerson])}
          onToggle={(id) => {
            onSelectPerson(id);
            onOpenChange(false);
          }}
          palette={globalGuestPalette}
          searchPlaceholder="Search guests..."
          emptyText='No guests match the current search.'
          showCheckbox={false}
          renderTrailingAction={(item) => {
            const guest = guests.find((g: any) => g.id === item.id);
            if (!guest) return null;
            return (
              <span
                role="button"
                tabIndex={0}
                aria-label={`Edit ${guest.name || "guest"}`}
                className="inline-flex h-10 w-10 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditGuest(guest);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onEditGuest(guest);
                  }
                }}
              >
                <Pencil className="h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground sm:hover:text-foreground" />
              </span>
            );
          }}
          footer={
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 sm:flex-none h-14 sm:h-12 text-base"
                onClick={() => onOpenChange(false)}
              >
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
            </div>
          }
          onItemClick={() => undefined}
        />
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
