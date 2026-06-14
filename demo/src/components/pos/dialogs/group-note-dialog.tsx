"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface GroupNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (text: string) => void;
  onLinkExisting?: (noteId: string) => void;
  selectedCount: number;
  existingNotes?: { id: string; text: string }[];
}

export function GroupNoteDialog({
  open,
  onOpenChange,
  onSave,
  onLinkExisting,
  selectedCount,
  existingNotes = [],
}: GroupNoteDialogProps) {
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    if (open) {
      setNoteText("");
    }
  }, [open]);

  const handleSave = () => {
    if (noteText.trim()) {
      onSave(noteText);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Add Group Note
          </DialogTitle>
          <DialogDescription>
            Add a shared note to the {selectedCount} selected items.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Textarea
            autoFocus
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g. Please make gluten-free, sauces on the side..."
            className="min-h-24 resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSave();
              }
            }}
          />
          <div className="text-[10px] text-muted-foreground">
            Tip: press{" "}
            <span className="font-medium text-foreground">Ctrl+Enter</span> or{" "}
            <span className="font-medium text-foreground">Cmd+Enter</span> to
            save.
          </div>

          {existingNotes.length > 0 && (
            <div className="pt-4 space-y-2 border-t">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Link Existing Note
              </div>
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1">
                {existingNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      if (onLinkExisting) onLinkExisting(note.id);
                      onOpenChange(false);
                    }}
                  >
                    <span className="text-xs font-medium text-foreground truncate pr-4">
                      {note.text}
                    </span>
                    <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!noteText.trim()}>
            Apply to Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
