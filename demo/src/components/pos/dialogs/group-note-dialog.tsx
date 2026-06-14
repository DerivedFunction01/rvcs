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
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";

interface GroupNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (text: string) => void;
  selectedCount: number;
}

export function GroupNoteDialog({
  open,
  onOpenChange,
  onSave,
  selectedCount,
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
