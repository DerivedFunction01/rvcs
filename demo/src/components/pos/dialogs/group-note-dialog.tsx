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
import { cn } from "@/lib/utils";
import { MessageSquare, Pencil, Plus, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type GroupNoteMode = "edit" | "add" | "attach";

interface ExistingNote {
  id: string;
  text: string;
}

interface GroupNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: GroupNoteMode;
  onModeChange: (mode: GroupNoteMode) => void;
  selectedCount: number;
  existingNotes?: ExistingNote[];
  selectedNoteId?: string | null;
  onCreateNote: (text: string) => void;
  onUpdateNote: (noteId: string, text: string) => void;
  onAttachExisting: (noteId: string) => void;
}

const modeMeta: Record<
  GroupNoteMode,
  { label: string; title: string; description: string; icon: React.ReactNode }
> = {
  edit: {
    label: "Edit existing",
    title: "Edit Group Note",
    description: "Update the shared note that is already attached.",
    icon: <Pencil className="w-5 h-5 text-primary" />,
  },
  add: {
    label: "Add new",
    title: "Add Group Note",
    description: "Add a shared note.",
    icon: <MessageSquare className="w-5 h-5 text-primary" />,
  },
  attach: {
    label: "Attach existing",
    title: "Attach Existing Note",
    description: "Attach to an existing shared note.",
    icon: <ArrowRight className="w-5 h-5 text-primary" />,
  },
};

export function GroupNoteDialog({
  open,
  onOpenChange,
  mode,
  onModeChange,
  selectedCount,
  existingNotes = [],
  selectedNoteId,
  onCreateNote,
  onUpdateNote,
  onAttachExisting,
}: GroupNoteDialogProps) {
  const [noteText, setNoteText] = useState("");
  const [draftNoteId, setDraftNoteId] = useState<string | null>(null);

  const selectedNote = useMemo(
    () => existingNotes.find((note) => note.id === selectedNoteId) || null,
    [existingNotes, selectedNoteId],
  );

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && selectedNote) {
      setNoteText(selectedNote.text);
      setDraftNoteId(selectedNote.id);
      return;
    }
    setNoteText("");
    setDraftNoteId(selectedNoteId ?? null);
  }, [open, mode, selectedNote, selectedNoteId]);

  const activeNoteId = draftNoteId ?? selectedNoteId ?? selectedNote?.id ?? null;

  const handleClose = () => {
    onOpenChange(false);
    setNoteText("");
  };

  const handleSave = () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;

    if (mode === "edit" && activeNoteId) {
      onUpdateNote(activeNoteId, trimmed);
    } else {
      onCreateNote(trimmed);
    }
    handleClose();
  };

  const switchMode = (nextMode: GroupNoteMode) => {
    onModeChange(nextMode);
    if (nextMode === "edit" && selectedNote) {
      setNoteText(selectedNote.text);
      setDraftNoteId(selectedNote.id);
    } else if (nextMode === "attach") {
      setNoteText("");
      setDraftNoteId(selectedNoteId ?? existingNotes[0]?.id ?? null);
    } else {
      setNoteText("");
      setDraftNoteId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setNoteText("");
      }}
    >
      <DialogContent
        className="sm:max-w-md md:max-w-lg landscape:sm:max-w-2xl landscape:md:max-w-4xl max-h-[95vh] landscape:md:min-h-95 overflow-y-auto landscape:max-h-[95vh] landscape:overflow-hidden flex flex-col p-6"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            handleClose();
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSave();
          }
        }}
      >
        <div className="flex flex-col landscape:flex-row gap-4 landscape:gap-6 h-full landscape:overflow-hidden">
          <div className="flex flex-col gap-4 flex-1 min-w-0 landscape:overflow-y-auto landscape:min-h-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {modeMeta[mode].icon}
                {modeMeta[mode].title}
              </DialogTitle>
              <DialogDescription>{modeMeta[mode].description}</DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 flex-wrap">
              {(Object.keys(modeMeta) as GroupNoteMode[]).map((nextMode) => (
                <Button
                  key={nextMode}
                  type="button"
                  variant={mode === nextMode ? "secondary" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => switchMode(nextMode)}
                >
                  {modeMeta[nextMode].label}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Textarea
                autoFocus
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={
                  mode === "attach"
                    ? "Select a note on the right to attach the current items."
                    : "e.g. Please make gluten-free, sauces on the side..."
                }
                className="min-h-28 resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                readOnly={mode === "attach"}
              />
              <div className="text-[10px] text-muted-foreground">
                Tip: press{" "}
                <span className="font-medium text-foreground">Ctrl+Enter</span>{" "}
                or <span className="font-medium text-foreground">Cmd+Enter</span>{" "}
                to save.
              </div>
            </div>

            <div className="hidden landscape:flex flex-row gap-3 pt-2 mt-auto w-full">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={mode === "attach" || !noteText.trim()}>
                {mode === "edit" ? "Save Note" : "Apply to Group"}
              </Button>
            </div>
          </div>

          <div className="shrink-0 landscape:w-70 landscape:md:w-96 landscape:mt-8 flex flex-col gap-3">
            <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Selection
              </div>
              <div className="text-sm font-medium">
                {selectedCount} selected item{selectedCount === 1 ? "" : "s"}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Existing Notes
              </div>
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {existingNotes.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    No existing notes yet.
                  </div>
                ) : (
                  existingNotes.map((note) => {
                    const isSelected = note.id === activeNoteId;
                    return (
                      <button
                        key={note.id}
                        type="button"
                        className={cn(
                          "flex items-center justify-between gap-3 p-2 rounded-lg border text-left transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "bg-muted/30 hover:bg-muted/50",
                        )}
                        onClick={() => {
                          if (mode === "edit") {
                            setDraftNoteId(note.id);
                            setNoteText(note.text);
                            return;
                          }
                          if (mode === "attach") {
                            onAttachExisting(note.id);
                            handleClose();
                            return;
                          }
                          onModeChange("attach");
                          setDraftNoteId(note.id);
                          setNoteText("");
                        }}
                      >
                        <span className="text-xs font-medium text-foreground truncate pr-2">
                          {note.text}
                        </span>
                        {mode === "attach" ? (
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="hidden landscape:flex flex-row gap-3 pt-2 mt-auto w-full" />
          </div>
        </div>

        <DialogFooter className="flex-row sm:flex-row gap-3 sm:gap-3 space-x-0 sm:space-x-0 pt-2 w-full landscape:hidden mt-2">
          <Button variant="outline" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={mode === "attach" || !noteText.trim()}
          >
            {mode === "edit" ? "Save Note" : "Apply to Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
