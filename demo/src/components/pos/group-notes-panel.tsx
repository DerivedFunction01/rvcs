"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, AlertTriangle, Trash2, X, ClipboardSignature } from "lucide-react";
import type { ProjectedState, NoteAllocation } from "@/lib/vcs/types";

interface GroupNotesPanelProps {
  projectedState: ProjectedState;
  onRemoveNoteFromItems: (lineIds: string[], noteId: string) => void;
  onCleanupStaleNotes: (noteIds: string[]) => void;
}

export function GroupNotesPanel({
  projectedState,
  onRemoveNoteFromItems,
  onCleanupStaleNotes,
}: GroupNotesPanelProps) {
  const { notes, staleNotes } = React.useMemo(() => {
    const allNotes: Array<{
      allocationId: string;
      text: string;
      linkedLineIds: string[];
      linkedItemNames: string[];
      isStale: boolean;
    }> = [];

    const noteAllocs = Object.values(projectedState.allocations).filter(
      (a): a is NoteAllocation => a.type === "note"
    );

    const activeItems = Object.values(projectedState.items).filter(
      (item) => item.qty > 0
    );

    for (const note of noteAllocs) {
      const linked = activeItems.filter((item) =>
        item.allocations.includes(note.allocationId)
      );

      allNotes.push({
        allocationId: note.allocationId,
        text: note.text,
        linkedLineIds: linked.map((i) => i.lineId),
        linkedItemNames: linked.map((i) => i.name),
        isStale: linked.length === 0,
      });
    }

    return {
      notes: allNotes.filter((n) => !n.isStale),
      staleNotes: allNotes.filter((n) => n.isStale),
    };
  }, [projectedState]);

  return (
    <aside className="w-80 border-l bg-card flex flex-col shrink-0">
      <div className="p-3 border-b flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Group Notes
        </h2>
        <Badge variant="secondary" className="text-[10px]">
          {notes.length} Active
        </Badge>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {/* Stale Notes Warning Panel */}
          {staleNotes.length > 0 && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50 space-y-2.5">
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold">Stale Notes Detected ({staleNotes.length})</p>
                  <p className="text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                    Notes exist in the ledger but all linked items have been removed or voided.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-[11px] font-semibold border-amber-300 hover:bg-amber-100 dark:border-amber-900 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                onClick={() => onCleanupStaleNotes(staleNotes.map((n) => n.allocationId))}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Purge Stale Notes
              </Button>
            </div>
          )}

          {/* Notes List */}
          <div className="space-y-2.5">
            {notes.length === 0 && staleNotes.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground/60 flex flex-col items-center justify-center gap-2">
                <ClipboardSignature className="w-8 h-8 text-muted-foreground/40" />
                <span>No group notes assigned.</span>
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.allocationId}
                  className="p-3 rounded-lg border bg-card/65 shadow-sm space-y-2.5 group relative hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold leading-relaxed text-foreground pr-6">
                      {note.text}
                    </p>
                    <button
                      title="Delete note"
                      className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-accent/40"
                      onClick={() => onRemoveNoteFromItems(note.linkedLineIds, note.allocationId)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                      Linked Items
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {note.linkedLineIds.map((lineId, idx) => (
                        <Badge
                          key={lineId}
                          variant="secondary"
                          className="text-[9px] font-medium py-0 px-1.5 flex items-center gap-1 max-w-full"
                        >
                          <span className="truncate">{note.linkedItemNames[idx]}</span>
                          <button
                            title="Unlink item"
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => onRemoveNoteFromItems([lineId], note.allocationId)}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
