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
    icon: <Pencil className="w-5 h-5 text-primary md:w-6 md:h-6" />,
  },
  add: {
    label: "Add new",
    title: "Add Group Note",
    description: "Add a shared note.",
    icon: <MessageSquare className="w-5 h-5 text-primary md:w-6 md:h-6" />,
  },
  attach: {
    label: "Attach existing",
    title: "Attach Existing Note",
    description: "Attach to an existing shared note.",
    icon: <ArrowRight className="w-5 h-5 text-primary md:w-6 md:h-6" />,
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
        className={cn(
          "sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl",
          "landscape:sm:max-w-2xl landscape:md:max-w-4xl landscape:lg:max-w-5xl landscape:xl:max-w-6xl",
          "max-h-[95vh] landscape:md:min-h-95 overflow-y-auto landscape:max-h-[95vh] landscape:overflow-hidden",
          "flex flex-col p-6 md:p-8"
        )}
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
        <div className="flex flex-col landscape:flex-row gap-4 landscape:gap-8 h-full landscape:overflow-hidden">
          <div className="flex flex-col gap-4 md:gap-6 flex-1 min-w-0 landscape:overflow-y-auto landscape:min-h-0">
            <DialogHeader className="space-y-2">
              <DialogTitle className="flex items-center gap-2 text-lg md:text-2xl">
                {modeMeta[mode].icon}
                {modeMeta[mode].title}
              </DialogTitle>
              <DialogDescription className="md:text-sm lg:text-base">
                {modeMeta[mode].description}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 flex-wrap">
              {(Object.keys(modeMeta) as GroupNoteMode[]).map((nextMode) => (
                <Button
                  key={nextMode}
                  type="button"
                  variant={mode === nextMode ? "secondary" : "outline"}
                  size="sm"
                  className="h-8 md:h-14 text-xs md:text-sm md:px-4 lg:text-base lg:px-6"
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
                className="min-h-28 md:min-h-40 resize-none text-sm md:text-base p-3"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                readOnly={mode === "attach"}
              />
              <div className="text-[10px] md:text-xs text-muted-foreground">
                Tip: press{" "}
                <span className="font-medium text-foreground">Ctrl+Enter</span>{" "}
                or <span className="font-medium text-foreground">Cmd+Enter</span>{" "}
                to save.
              </div>
            </div>

            <div className="hidden landscape:flex flex-row gap-3 pt-2 mt-auto w-full">
              <Button
                variant="outline"
                className="flex-1 md:h-16 md:text-base"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 md:h-16 md:text-base"
                onClick={handleSave}
                disabled={mode === "attach" || !noteText.trim()}
              >
                {mode === "edit" ? "Save Note" : "Apply to Group"}
              </Button>
            </div>
          </div>

          <div className="shrink-0 landscape:w-70 landscape:md:w-96 landscape:lg:w-104 landscape:xl:w-md landscape:mt-8 flex flex-col gap-4">
            <div className="rounded-lg border bg-muted/20 p-3 md:p-4 space-y-1">
              <div className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Selection
              </div>
              <div className="text-sm md:text-base font-medium">
                {selectedCount} selected item{selectedCount === 1 ? "" : "s"}
              </div>
            </div>

            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <div className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Existing Notes
              </div>
              <div className="flex flex-col gap-2 max-h-72 landscape:max-h-none landscape:flex-1 overflow-y-auto pr-1">
                {existingNotes.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-xs md:text-sm text-muted-foreground">
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
                          "flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-colors min-h-11 md:min-h-14",
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
                        <span className="text-xs md:text-sm font-medium text-foreground truncate pr-2">
                          {note.text}
                        </span>
                        {mode === "attach" ? (
                          <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row sm:flex-row gap-3 sm:gap-3 space-x-0 sm:space-x-0 pt-2 w-full landscape:hidden mt-2">
          <Button
            variant="outline"
            className="flex-1 md:h-11 md:text-base"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 md:h-11 md:text-base"
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