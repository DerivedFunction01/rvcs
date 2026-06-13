import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, UserPlus, Pencil, Minus, Plus, Search } from "lucide-react";
import { GUEST_PALETTE, type Guest } from "@/lib/pos/ui-utils";

export function AddGuestDialog({
  open,
  onOpenChange,
  guests,
  onAddGuests
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: Guest[];
  onAddGuests: (newGuests: Guest[]) => void;
}) {
  const [count, setCount] = useState(1);
  const [alias, setAlias] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setCount(1);
      setAlias("");
      setDescription("");
    }
  }, [open]);

  const handleSubmit = () => {
    const currentMax = guests.length > 0 ? Math.max(...guests.map((g) => g.number)) : 0;
    const newGuests: Guest[] = [];
    if (count === 1) {
      const a = alias.trim() || undefined;
      const d = description.trim() || undefined;
      const nextNum = currentMax + 1;
      newGuests.push({ id: `__vcs_guest_${nextNum}__`, number: nextNum, alias: a, description: d });
    } else {
      for (let i = 0; i < count; i++) {
        const nextNum = currentMax + 1 + i;
        newGuests.push({ id: `__vcs_guest_${nextNum}__`, number: nextNum, alias: undefined, description: undefined });
      }
    }
    onAddGuests(newGuests);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Add Guests</DialogTitle>
          <DialogDescription>Add one or more guests to the order. Guests are automatically numbered.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Number of guests to add</label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCount(Math.max(1, count - 1))}><Minus className="w-3.5 h-3.5" /></Button>
              <Input type="number" value={count} onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))} className="h-8 w-20 text-center text-xs font-mono" min={1} />
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCount(count + 1)}><Plus className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
          {count === 1 && (
            <>
              <div className="space-y-1.5 mt-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alias / Name (Optional)</label>
                <Input autoFocus value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="e.g. John" className="h-9 text-xs" onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} />
              </div>
              <div className="space-y-1.5 mt-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description / Details (Optional)</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Allergy: Peanut, or Host" className="h-9 text-xs" onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Add {count} Guest{count !== 1 ? "s" : ""}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GuestPickerDialog({ open, onOpenChange, guests, selectedPerson, onSelectPerson, onEditGuest, onOpenAddGuest }: any) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (open) setQuery(""); }, [open]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g: Guest) => (g.alias || `Guest ${g.number}`).toLowerCase().includes(q) || (g.description || "").toLowerCase().includes(q));
  }, [guests, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Select Guest</DialogTitle>
          <DialogDescription>Choose a guest from the grid or add a new one if they are not listed.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search guests..." className="pl-9" />
        </div>
        <ScrollArea className="max-h-[52vh] pr-2">
          {filtered.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground">No guests match "{query.trim()}".</div> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filtered.map((guest: Guest) => (
                <div key={guest.id} onClick={() => { onSelectPerson(guest.id); onOpenChange(false); }} className={`relative group flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:bg-accent/40 cursor-pointer ${selectedPerson === guest.id ? "border-primary bg-primary/5" : "bg-card"}`}>
                  <div className="flex items-center justify-between w-full">
                    <span className={`w-2.5 h-2.5 rounded-full ${GUEST_PALETTE[guests.findIndex((g: Guest) => g.id === guest.id) % GUEST_PALETTE.length]}`} />
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onEditGuest(guest); }}><Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" /></Button>
                  </div>
                  <span className="w-full truncate text-sm font-semibold">{guest.alias || `Guest ${guest.number}`}</span>
                  {guest.description && <span className="text-[10px] text-muted-foreground/85 italic mt-0.5 truncate w-full">{guest.description}</span>}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => { onOpenChange(false); onOpenAddGuest(); }}><UserPlus className="w-3.5 h-3.5" /> Add Guest</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditGuestDialog({ open, onOpenChange, guestToEdit, onSave }: any) {
  const [alias, setAlias] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => { if (open && guestToEdit) { setAlias(guestToEdit.alias || ""); setDescription(guestToEdit.description || ""); } }, [open, guestToEdit]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-primary" /> Edit Guest</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2"><div className="space-y-2"><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Guest Name (Alias)</label><Input autoFocus value={alias} onChange={(e) => setAlias(e.target.value)} placeholder={`Guest ${guestToEdit?.number}`} onKeyDown={(e) => { if (e.key === "Enter") { onSave(alias, description); onOpenChange(false); } }} /></div><div className="space-y-2"><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description / Details (Optional)</label><Input value={description} onChange={(e) => setDescription(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { onSave(alias, description); onOpenChange(false); } }} /></div></div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={() => { onSave(alias, description); onOpenChange(false); }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}