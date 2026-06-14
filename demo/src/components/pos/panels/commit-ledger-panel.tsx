import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HistoryOpType } from "@/lib/pos/types";
import { getBranchColorInfo } from "@/lib/pos/ui-utils";
import { buildCommitGraph } from "@/lib/vcs/graph";
import { DeltaActionType } from "@/lib/vcs/types";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Eraser,
  Filter,
  GitBranch,
  GitCommitHorizontal,
  Lightbulb,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
} from "lucide-react";
import React from "react";
import { toast } from "sonner";

export function CommitLedgerPanel(props: any) {
  const {
    isLedgerCollapsed,
    setIsLedgerCollapsed,
    log,
    viewingHash,
    headHash,
    isViewingHistory,
    viewRevision,
    graphData,
    expandedCommits,
    toggleCommitExpanded,
    checkoutBranch,
    activeBranch,
    branches,
    setHistoryOpDialog,
    engine,
    confirmedHash,
  } = props;

  const [selectedBranches, setSelectedBranches] =
    React.useState<Set<string> | null>(null);

  const uniqueBranches = React.useMemo<string[]>(() => {
    return Array.from(new Set(log.map((c: any) => c.branch as string))).filter((b: any) => String(b) !== "system") as string[];
  }, [log]);

  const filteredLog = React.useMemo(() => {
    const baseLog = log.filter((c: any) => String(c.branch) !== "system");
    if (!selectedBranches) return baseLog;
    return baseLog.filter((c: any) => selectedBranches.has(c.branch));
  }, [log, selectedBranches]);

  const localGraphData = React.useMemo(() => {
    return buildCommitGraph(
      filteredLog,
      activeBranch,
      engine.getMainActiveBranch(),
      expandedCommits,
      branches,
    );
  }, [filteredLog, activeBranch, engine, expandedCommits, branches]);

  return (
    <aside
      className={`border-l bg-card flex flex-col shrink-0 transition-all duration-200 ${isLedgerCollapsed ? "w-12" : "w-72"}`}
    >
      <div
        className={`p-3 border-b flex ${isLedgerCollapsed ? "flex-col items-center gap-3" : "items-center justify-between gap-2"}`}
      >
        {isLedgerCollapsed ? (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsLedgerCollapsed(false)}
                  >
                    <GitCommitHorizontal className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Commit Ledger</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsLedgerCollapsed((prev: any) => !prev)}
              title="Expand ledger"
            >
              <PanelRightOpen className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <GitCommitHorizontal className="w-3.5 h-3.5" />
              Ledger
            </h2>
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    title="Filter branches"
                  >
                    <Filter className="w-3.5 h-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between font-semibold px-1 py-0.5 border-b pb-1.5">
                      <span>Filter Branches</span>
                      <div className="flex gap-1.5">
                        <Button
                          variant="link"
                          className="h-auto p-0 text-[10px] font-semibold text-primary"
                          onClick={() => setSelectedBranches(null)}
                        >
                          All
                        </Button>
                        <Button
                          variant="link"
                          className="h-auto p-0 text-[10px] font-semibold text-primary"
                          onClick={() =>
                            setSelectedBranches(new Set([activeBranch]))
                          }
                        >
                          Current
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {uniqueBranches.map((br) => {
                        const isChecked =
                          !selectedBranches || selectedBranches.has(br);
                        return (
                          <label
                            key={br}
                            className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                setSelectedBranches((prev) => {
                                  const next = new Set<string>(
                                    prev || uniqueBranches,
                                  );
                                  if (checked) {
                                    next.add(br);
                                  } else {
                                    if (next.size > 1) {
                                      next.delete(br);
                                    } else {
                                      toast.warning(
                                        "At least one branch must be selected.",
                                      );
                                    }
                                  }
                                  if (next.size === uniqueBranches.length) {
                                    return null;
                                  }
                                  return next;
                                });
                              }}
                            />
                            <span className="truncate">
                              {branches[br]?.label || br}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {filteredLog.length}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsLedgerCollapsed((prev: any) => !prev)}
                title="Minimize ledger"
              >
                <PanelRightClose className="w-3.5 h-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>
      {!isLedgerCollapsed && (
        <>
          {isViewingHistory && (
            <div className="px-3 py-2 border-b bg-amber-50 dark:bg-amber-950/20 flex items-center justify-between gap-2">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3" />
                Time-traveling
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] px-2 text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 shrink-0"
                onClick={() => viewRevision(null)}
              >
                <RotateCcw className="w-2.5 h-2.5 mr-0.5" />
                Back to HEAD
              </Button>
            </div>
          )}
          <ScrollArea className="flex-1 min-h-0">
            {filteredLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground/50">
                <GitCommitHorizontal className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs">No commits found</p>
              </div>
            ) : (
              <div className="relative flex min-h-full">
                <div
                  style={{ width: localGraphData.width }}
                  className="relative shrink-0 select-none overflow-hidden"
                >
                  <svg
                    width={localGraphData.width}
                    height={localGraphData.height}
                    className="absolute top-0 left-0"
                  >
                    {localGraphData.lines.map((line: any) => (
                      <g key={line.id}>
                        {line.isMain && (
                          <line
                            x1={line.startX}
                            y1={line.startY}
                            x2={line.endX}
                            y2={line.endY}
                            stroke={line.color}
                            strokeWidth={6}
                            strokeOpacity={0.2}
                            strokeLinecap="round"
                          />
                        )}
                        <line
                          x1={line.startX}
                          y1={line.startY}
                          x2={line.endX}
                          y2={line.endY}
                          stroke={line.color}
                          strokeWidth={line.isMain ? 3 : 2}
                          strokeLinecap="round"
                          strokeDasharray={line.dashed ? "4,4" : undefined}
                        />
                      </g>
                    ))}
                    {localGraphData.nodes.map((node: any) => {
                      const isActive =
                        viewingHash === node.commitHash ||
                        (viewingHash === null && node.commitHash === headHash);
                      return (
                        <g key={node.commitHash}>
                          {isActive && (
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={7}
                              fill="none"
                              stroke={node.color}
                              strokeWidth={1.5}
                              className="animate-pulse"
                            />
                          )}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={isActive ? 4.5 : 3.5}
                            fill={node.color}
                            className="transition-all duration-200"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  {filteredLog.map((commit: any, idx: number) => {
                    const isActive =
                      viewingHash === commit.commitHash ||
                      (viewingHash === null && commit.commitHash === headHash);
                    const isExpanded = expandedCommits.has(commit.commitHash);
                    const node = localGraphData.nodes[idx];
                    const isHead = commit.commitHash === headHash;
                    const isConfirmed = !!(
                      confirmedHash &&
                      (commit.commitHash === confirmedHash ||
                        engine.isAncestorOf(commit.commitHash, confirmedHash))
                    );
                    const hasActions =
                      !isConfirmed &&
                      !isHead &&
                      !commit.authorId.startsWith("system-");

                    return (
                      <div
                        key={commit.commitHash}
                        style={{ height: node.rowHeight }}
                        className="flex flex-col justify-start py-0.75 group/commit"
                      >
                        <div
                          onClick={() => viewRevision(commit.commitHash)}
                          className={`w-full text-left rounded-lg border p-1.5 transition-all text-xs cursor-pointer select-none flex flex-col justify-center h-12.5 relative ${isActive ? "border-primary bg-primary/5 shadow-xs" : "border-transparent hover:border-border hover:bg-accent/40"}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[9px] font-semibold text-muted-foreground truncate max-w-12.5">
                              {commit.commitHash.substring(0, 7)}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[8px] h-3.5 px-1 shrink-0 scale-90 bg-muted text-muted-foreground"
                            >
                              {commit.authorId.split("-")[0]}
                            </Badge>
                            {hasActions && (
                              <div className="flex items-center gap-1 opacity-0 group-hover/commit:opacity-100 transition-opacity ml-auto pointer-events-none group-hover/commit:pointer-events-auto">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setHistoryOpDialog({
                                            type: HistoryOpType.Squash,
                                            targetHash: commit.commitHash,
                                            label: "Squash to HEAD",
                                            description: `Collapse pending commits up to HEAD.`,
                                          });
                                        }}
                                        className="h-5 w-5 rounded-md flex items-center justify-center bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 border border-sky-500/20 shadow-xs"
                                      >
                                        <ChevronsUpDown className="w-3 h-3" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="left"
                                      className="text-[10px]"
                                    >
                                      Squash from here to HEAD
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setHistoryOpDialog({
                                            type: HistoryOpType.Reset,
                                            targetHash: commit.commitHash,
                                            label: "Reset to here",
                                            description: `Reset branch HEAD to ${commit.commitHash.substring(0, 7)}.`,
                                          });
                                        }}
                                        className="h-5 w-5 rounded-md flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 shadow-xs"
                                      >
                                        <Eraser className="w-3 h-3" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="left"
                                      className="text-[10px]"
                                    >
                                      Reset branch to here
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCommitExpanded(commit.commitHash);
                              }}
                              className={`p-0.5 rounded hover:bg-muted shrink-0 ${hasActions ? "" : "ml-auto"}`}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-[8px] text-muted-foreground/75 mt-0.5 font-mono">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (activeBranch !== commit.branch) {
                                        checkoutBranch(commit.branch);
                                        toast.success(
                                          `Switched active branch to "${commit.branch}"`,
                                        );
                                      }
                                    }}
                                    className={`text-[8px] px-1 py-0 h-4 font-semibold cursor-pointer shrink-0 transition-all flex items-center gap-0.5 select-none ${getBranchColorInfo(commit.branch).badge} ${activeBranch === commit.branch ? "ring-1 ring-offset-0 ring-primary/30 font-bold" : ""}`}
                                  >
                                    {branches[commit.branch]?.type ===
                                      "hypothetical" ? (
                                      <Lightbulb className="w-2.5 h-2.5" />
                                    ) : (
                                      <GitBranch className="w-2.5 h-2.5" />
                                    )}
                                    <span className="truncate max-w-15">
                                      {branches[commit.branch]?.label ||
                                        commit.branch}
                                    </span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="text-[10px]"
                                >
                                  {activeBranch === commit.branch
                                    ? `Current active branch: ${commit.branch}`
                                    : `Click to switch active branch to "${commit.branch}"`}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <span>
                              {new Date(commit.timestamp).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="mt-1 pl-2 pr-1 space-y-1 overflow-y-auto max-h-45 border-l-2 border-primary/20 ml-2 animate-in fade-in duration-100">
                            {commit.deltas.map((d: any, i: number) => (
                              <div
                                key={i}
                                className="text-[9px] text-muted-foreground flex items-center gap-1.5"
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.action === DeltaActionType.DeclareAllocation ? "bg-violet-500" : d.action === DeltaActionType.AddItem ? "bg-emerald-500" : d.action === DeltaActionType.RemoveItem ? "bg-red-500" : d.action.includes("modify") ? "bg-amber-500" : "bg-sky-500"}`}
                                />
                                <span className="font-mono font-medium truncate shrink-0">
                                  {d.action}
                                </span>
                                {"sku" in d && d.sku && (
                                  <span className="truncate text-muted-foreground/60 font-mono">
                                    {String(d.sku)}
                                  </span>
                                )}
                                {d.action ===
                                  DeltaActionType.ModifyItemAllocations &&
                                  "lineId" in d && (
                                    <span className="truncate text-muted-foreground/60 font-mono">
                                      {(
                                        d as { lineId: string }
                                      ).lineId.substring(0, 8)}
                                    </span>
                                  )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollArea>
        </>
      )}
      {!isLedgerCollapsed && (
        <div className="p-3 border-t">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Offline-ready
            </span>
            <span>{log.length} local commits</span>
          </div>
        </div>
      )}
    </aside>
  );
}
