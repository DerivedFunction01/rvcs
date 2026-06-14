"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { NoteAllocation, ProjectedState } from "@/lib/vcs/types";
import {
  AlertTriangle,
  ClipboardSignature,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Trash2,
  X,
} from "lucide-react";
import React from "react";

interface GroupNotesPanelProps {
  projectedState: ProjectedState;
  onRemoveNoteFromItems: (lineIds: string[], noteId: string) => void;
  onCleanupStaleNotes: (noteIds: string[]) => void;
  onAttachNoteToOrder: (noteId: string, attached: boolean) => void;
  isGroupNotesCollapsed: boolean;
  setIsGroupNotesCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export function GroupNotesPanel({
  projectedState,
  onRemoveNoteFromItems,
  onCleanupStaleNotes,
  onAttachNoteToOrder,
  isGroupNotesCollapsed,
  setIsGroupNotesCollapsed,
}: GroupNotesPanelProps) {
  const { notes, staleNotes, orderNotes } = React.useMemo(() => {
    const allNotes: Array<{
      allocationId: string;
      text: string;
      linkedLineIds: string[];
      linkedItemNames: string[];
      isStale: boolean;
      attachedToOrder?: boolean;
    }> = [];

    const noteAllocs = Object.values(projectedState.allocations).filter(
      (a): a is NoteAllocation => a.type === "note",
    );

    const activeItems = Object.values(projectedState.items).filter(
      (item) => item.qty > 0,
    );

    for (const note of noteAllocs) {
      const linked = activeItems.filter((item) =>
        item.allocations.includes(note.allocationId),
      );

      allNotes.push({
        allocationId: note.allocationId,
        text: note.text,
        linkedLineIds: linked.map((i) => i.lineId),
        linkedItemNames: linked.map((i) => i.name),
        isStale: linked.length === 0 && note.attachedTo !== "order",
        attachedToOrder: note.attachedTo === "order",
      });
    }

    return {
      notes: allNotes.filter((n) => !n.isStale && !n.attachedToOrder),
      staleNotes: allNotes.filter((n) => n.isStale),
      orderNotes: allNotes.filter((n) => n.attachedToOrder),
    };
  }, [projectedState]);

  return (
    <aside
      className={`border-l bg-card flex flex-col shrink-0 transition-all duration-200 ${isGroupNotesCollapsed ? "w-12" : "w-80"}`}
    >
      <div
        className={`p-3 border-b flex ${isGroupNotesCollapsed ? "flex-col items-center gap-3" : "items-center justify-between gap-2"}`}
      >
        {isGroupNotesCollapsed ? (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsGroupNotesCollapsed(false)}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Group Notes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsGroupNotesCollapsed((prev: any) => !prev)}
              title="Expand notes"
            >
              <PanelRightOpen className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Group Notes
            </h2>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-[10px]">
                {notes.length + orderNotes.length} Active
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsGroupNotesCollapsed((prev: any) => !prev)}
                title="Minimize notes"
              >
                <PanelRightClose className="w-3.5 h-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>

      {!isGroupNotesCollapsed && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-4">
            {/* Stale Notes Warning Panel */}
            {staleNotes.length > 0 && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50 space-y-3">
                <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold">
                      Stale Notes Detected ({staleNotes.length})
                    </p>
                    <p className="text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                      Notes exist in the ledger but all linked items have been
                      removed or voided.
                    </p>
                  </div>
                </div>

                {/* Individual Stale Notes List */}
                <div className="space-y-2 pt-1 border-t border-amber-200/50 dark:border-amber-900/40">
                  {staleNotes.map((note) => (
                    <div
                      key={note.allocationId}
                      className="bg-background/85 dark:bg-card/50 p-2 rounded border border-amber-200 dark:border-amber-900/45 text-xs space-y-1.5 shadow-sm"
                    >
                      <div className="font-medium text-foreground pr-4 wrap-break-word">
                        "{note.text}"
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-5 text-[9px] px-1.5 py-0 bg-background hover:bg-accent border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 font-medium"
                          onClick={() =>
                            onAttachNoteToOrder(note.allocationId, true)
                          }
                        >
                          Attach to Order
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-5 text-[9px] px-1.5 py-0 bg-background hover:bg-accent border-amber-200 dark:border-amber-900 text-destructive hover:text-destructive font-medium"
                          onClick={() =>
                            onCleanupStaleNotes([note.allocationId])
                          }
                        >
                          Purge
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[11px] font-semibold border-amber-300 hover:bg-amber-100 dark:border-amber-900 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                  onClick={() =>
                    onCleanupStaleNotes(staleNotes.map((n) => n.allocationId))
                  }
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Purge All Stale Notes
                </Button>
              </div>
            )}

            {/* Order Notes Section */}
            {orderNotes.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                  Order Notes
                </span>
                <div className="space-y-2">
                  {orderNotes.map((note) => (
                    <div
                      key={note.allocationId}
                      className="p-3 rounded-lg border border-primary/20 bg-primary/5 shadow-sm space-y-2 group relative hover:border-primary/40 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold leading-relaxed text-foreground pr-6">
                          {note.text}
                        </p>
                        <button
                          title="Detach from order"
                          className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-accent/40"
                          onClick={() =>
                            onAttachNoteToOrder(note.allocationId, false)
                          }
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className="text-[9px] bg-background text-primary border-primary/20"
                        >
                          📌 Attached to Order
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[9px] text-destructive hover:bg-destructive/10 px-1.5"
                          onClick={() =>
                            onCleanupStaleNotes([note.allocationId])
                          }
                        >
                          Delete Note
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes List */}
            <div className="space-y-2.5">
              {notes.length === 0 &&
              staleNotes.length === 0 &&
              orderNotes.length === 0 ? (
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
                        onClick={() =>
                          onRemoveNoteFromItems(
                            note.linkedLineIds,
                            note.allocationId,
                          )
                        }
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
                            <span className="truncate">
                              {note.linkedItemNames[idx]}
                            </span>
                            <button
                              title="Unlink item"
                              className="text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() =>
                                onRemoveNoteFromItems(
                                  [lineId],
                                  note.allocationId,
                                )
                              }
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
      )}
    </aside>
  );
}
