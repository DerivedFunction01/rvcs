import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectedLineItem } from "@/lib/vcs/types";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";

export function NoteDialog({
  open,
  onOpenChange,
  noteItem,
  isComboChildItem,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteItem: ProjectedLineItem | null;
  isComboChildItem: boolean;
  onSave: (text: string, linkToComboBase: boolean) => void;
}) {
  const [noteText, setNoteText] = useState("");
  const [linkToComboBase, setLinkToComboBase] = useState(false);

  useEffect(() => {
    if (open) {
      setLinkToComboBase(false);
      if (noteItem?.sku === "custom_note")
        setNoteText(noteItem.selectedModifierState || "");
      else setNoteText("");
    }
  }, [open, noteItem]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setNoteText("");
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            {noteItem?.sku === "custom_note" ? "Edit Note" : "Add Note"}
          </DialogTitle>
          <DialogDescription>
            {noteItem?.sku === "custom_note"
              ? "Edit the custom note."
              : "Add a custom note to this item."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Textarea
            autoFocus
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Enter note here..."
            className="min-h-24 resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onOpenChange(false);
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSave(noteText, linkToComboBase);
              }
            }}
          />
          <div className="text-[10px] text-muted-foreground">
            Tip: press{" "}
            <span className="font-medium text-foreground">Ctrl+Enter</span> or{" "}
            <span className="font-medium text-foreground">Cmd+Enter</span> to
            save.
          </div>
          {isComboChildItem && noteItem?.sku !== "custom_note" && (
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="link-to-base-checkbox"
                checked={linkToComboBase}
                onCheckedChange={(v) => setLinkToComboBase(!!v)}
              />
              <label
                htmlFor="link-to-base-checkbox"
                className="text-xs font-semibold leading-none cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors"
              >
                Apply note to combo base (will not be deleted if item is
                swapped)
              </label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave(noteText, linkToComboBase)}>
            {noteItem?.sku === "custom_note" ? "Save Note" : "Add Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
