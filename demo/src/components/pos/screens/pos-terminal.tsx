"use client";

import { buildCommitGraph } from "@/lib/vcs/graph";
import { useVCSStore } from "@/store/vcs-store";
import React from "react";

import { CombineDialog } from "@/components/pos/dialogs/combine-dialog";
import { SplitIntoLinesDialog } from "@/components/pos/dialogs/split-into-lines-dialog";
import { NumberPadDialog } from "@/components/pos/dialogs/number-pad-dialog";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";

import { usePostTerminalActions } from "@/components/pos/screens/hooks/use-post-terminal-actions";
import { usePostTerminalAllocationDialogs } from "@/components/pos/screens/hooks/use-post-terminal-allocation-dialogs";
import { usePostTerminalBranchDialogs } from "@/components/pos/screens/hooks/use-post-terminal-branch-dialogs";
import { usePostTerminalCatalog } from "@/components/pos/screens/hooks/use-post-terminal-catalog";
import { usePostTerminalConfigs } from "@/components/pos/screens/hooks/use-post-terminal-configs";
import { usePostTerminalDialogs } from "@/components/pos/screens/hooks/use-post-terminal-dialogs";
import { usePostTerminalGuests } from "@/components/pos/screens/hooks/use-post-terminal-guests";
import { usePostTerminalQtyDialogs } from "@/components/pos/screens/hooks/use-post-terminal-qty-dialogs";
import { usePostTerminalSelection } from "@/components/pos/screens/hooks/use-post-terminal-selection";

import { PosAllocationDialogs } from "@/components/pos/screens/dialogs/pos-allocation-dialogs";
import { PosBranchDialogs } from "@/components/pos/screens/dialogs/pos-branch-dialogs";
import { PosChoiceDialogs } from "@/components/pos/screens/dialogs/pos-choice-dialogs";
import { PosGuestDialogs } from "@/components/pos/screens/dialogs/pos-guest-dialogs";
import { PosOtherDialogs } from "@/components/pos/screens/dialogs/pos-other-dialogs";
import { GlobalSettingsDialog } from "@/components/pos/dialogs/global-settings-dialog";

import { ActiveCheckActionFilterBar } from "@/components/pos/bars/active-check-action-filter-bar";
import { ActiveCheckPanel } from "@/components/pos/panels/active-check-panel";
import { CatalogPanel } from "@/components/pos/panels/catalog-panel";
import { CommitLedgerPanel } from "@/components/pos/panels/commit-ledger-panel";
import { InlineModifierPanel } from "@/components/pos/panels/inline-modifier-panel";
import { GroupNotesPanel } from "@/components/pos/panels/group-notes-panel";
import { BulkActionsPanel } from "@/components/pos/panels/bulk-actions-panel";

import { OrderContextBanner } from "@/components/pos/bars/order-context-banner";
import { PosQtyDialogs } from "@/components/pos/screens/dialogs/pos-qty-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator as SeparatorUI } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AllocationContext,
  type FloorConfig,
  type OrderTypeConfig,
  ViewMode,
} from "@/lib/pos/types";
import {
  AllocationType,
  ItemStatus,
  type PaymentAllocation,
  type ProjectedLineItem,
} from "@/lib/vcs/types";
import {
  ChevronDown,
  Clock,
  CreditCard,
  GitBranch,
  GitCommitHorizontal,
  Layers,
  Lightbulb,
  Lock,
  MessageSquare,
  Settings2,
  User,
  XCircle,
} from "lucide-react";
import { usePreferencesStore } from "@/store/preferences-store";

// ─── POS Terminal (rendered after init) ────────────────────────────────────

export function POSTerminalScreen({
  floorConfigs,
}: {
  floorConfigs: FloorConfig[];
  orderTypes: OrderTypeConfig[];
}) {
  const {
    engine,
    projectedState,
    viewingHash,
    catalog,
    activeBranch,
    commitLog,
    headHash,
    removeItem,
    checkoutBranch,
    viewRevision,
    mainActiveBranch,
    orderContext,
    defaultPaymentMethod,
    defaultPaymentAllocId,
    defaultAssignmentAllocId,
    activePaymentConfigId,
    activeFulfillmentConfigId,
    duplicateItems,
    removeItems,
    modifyItemsQty,
    mergeItems,
    breakItems,
    combineItems,
    splitItemsIntoIncrements,
    addModifier,
    modifyItemInlineQty,
    modifyModifierState,
  } = useVCSStore();
  const iconConfigs = useVCSStore((state) => state.iconConfigs);

  // ─── Dynamic Guest List ─────────────────────────────────────────────
  const currentBranchName = activeBranch();

  const terminalGuests = usePostTerminalGuests(
    projectedState.allocations,
    defaultAssignmentAllocId,
  );
  const {
    storeGuests,
    guests,
    resolveGuestName,
    selectedPerson,
    setSelectedPerson,
    guestChoiceOptions,
    selectedGuestCount,
    selectedGuestLabel,
    selectedGuestDescription,
    visibleAssignees,
    setVisibleAssignees,
    visiblePayers,
    setVisiblePayers,
    guestFilterOp,
    setGuestFilterOp,
  } = terminalGuests;

  const terminalConfigs = usePostTerminalConfigs({
    projectedState,
    activePaymentConfigId,
    activeFulfillmentConfigId,
    defaultPaymentAllocId,
    orderContext,
    resolveGuestName,
  });
  const {
    resolvedAllocations,
    currentConfigName,
    currentFulfillmentConfigName,
  } = terminalConfigs;

  const baseDialogs = usePostTerminalDialogs();
  const {
    setAddGuestOpen,
    setGuestPickerOpen,
    setRemoveModDialogOpen,
    groupNoteLineIds,
    setModifierAddOpen,
    modifierAddItem,
    setModifierAddItem,
    swapChoiceState,
    setNoteDialogOpen,
    noteItem,
    handleOpenCustomerDialog,
    handleOpenModifierDialog,
    handleOpenSwapDialog,
    handleOpenNoteDialog,
    handleOpenGroupNoteDialog,
  } = baseDialogs;

  const allocationDialogs = usePostTerminalAllocationDialogs();
  const {
    setAssignmentAllocationOpen,
    setAssignmentAllocationContext,
    setAssignmentAllocationItems,
    setPaymentAllocationOpen,
    setPaymentAllocationContext,
    setPaymentAllocationItems,
    setFulfillmentAllocationOpen,
    setFulfillmentAllocationContext,
    setFulfillmentAllocationItems,
    handleAllocConfig,
  } = allocationDialogs;

  const qtyDialogs = usePostTerminalQtyDialogs();
  const { setQtyPadOpen, setSplitQtyDialogOpen, setDupMoveDialogOpen } =
    qtyDialogs;

  const branchDialogs = usePostTerminalBranchDialogs();
  const {
    historyOpDialog,
    setHistoryOpDialog,
    setIsBranchManagerOpen,
    branchToConfig,
    showResetConfirm,
    setShowResetConfirm,
  } = branchDialogs;

  const repoId = engine.getRepo().contextId;
  const { getPreferences, updateRepoPreferences } = usePreferencesStore();
  const prefs = React.useMemo(
    () => getPreferences(repoId),
    [getPreferences, repoId],
  );

  const [isLedgerCollapsedState, setIsLedgerCollapsedState] = React.useState(
    prefs.isLedgerCollapsed,
  );
  const [isGroupNotesCollapsedState, setIsGroupNotesCollapsedState] =
    React.useState(prefs.isGroupNotesCollapsed);
  const [isBulkActionsCollapsedState, setIsBulkActionsCollapsedState] =
    React.useState(prefs.isBulkActionsCollapsed);
  const [collapsedItems, setCollapsedItems] = React.useState<Set<string>>(
    new Set(),
  );
  const [detailLevelState, setDetailLevelState] = React.useState<ViewMode>(
    prefs.detailLevel,
  );
  const [isCompactModeState, setIsCompactModeState] = React.useState(
    prefs.isCompactMode,
  );

  const isLedgerCollapsed = isLedgerCollapsedState;
  const isGroupNotesCollapsed = isGroupNotesCollapsedState;
  const isBulkActionsCollapsed = isBulkActionsCollapsedState;
  const detailLevel = detailLevelState;
  const isCompactMode = isCompactModeState;

  const setIsLedgerCollapsed = React.useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      setIsLedgerCollapsedState((prev) => {
        const next = typeof val === "function" ? val(prev) : val;
        updateRepoPreferences(repoId, { isLedgerCollapsed: next });
        return next;
      });
    },
    [repoId, updateRepoPreferences],
  );

  const setIsGroupNotesCollapsed = React.useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      setIsGroupNotesCollapsedState((prev) => {
        const next = typeof val === "function" ? val(prev) : val;
        updateRepoPreferences(repoId, { isGroupNotesCollapsed: next });
        return next;
      });
    },
    [repoId, updateRepoPreferences],
  );

  const setIsBulkActionsCollapsed = React.useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      setIsBulkActionsCollapsedState((prev) => {
        const next = typeof val === "function" ? val(prev) : val;
        updateRepoPreferences(repoId, { isBulkActionsCollapsed: next });
        return next;
      });
    },
    [repoId, updateRepoPreferences],
  );

  const setDetailLevel = React.useCallback(
    (val: ViewMode | ((prev: ViewMode) => ViewMode)) => {
      setDetailLevelState((prev) => {
        const next = typeof val === "function" ? val(prev) : val;
        updateRepoPreferences(repoId, { detailLevel: next });
        return next;
      });
    },
    [repoId, updateRepoPreferences],
  );

  const setIsCompactMode = React.useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      setIsCompactModeState((prev) => {
        const next = typeof val === "function" ? val(prev) : val;
        updateRepoPreferences(repoId, { isCompactMode: next });
        return next;
      });
    },
    [repoId, updateRepoPreferences],
  );

  const [hideCanceled, setHideCanceled] = React.useState(false);
  const [globalSettingsOpen, setGlobalSettingsOpen] = React.useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = React.useState(
    !!prefs.defaultMultiSelectMode,
  );
  const [autoSelectLastClickedItem, setAutoSelectLastClickedItem] = React.useState(
    !!prefs.autoSelectLastClickedItem,
  );

  const [qtyStep, setQtyStep] = React.useState<number | "">(1);
  const parsedStep = Number(qtyStep) || 1;
  const [combineDialogOpen, setCombineDialogOpen] = React.useState(false);
  const [splitLineDialogOpen, setSplitLineDialogOpen] = React.useState(false);
  const [qtyStepPadOpen, setQtyStepPadOpen] = React.useState(false);
  const formatNumber = useFormatNumber();

  const hasCollapsedItems = collapsedItems.size > 0;
  const handleToggleCollapse = React.useCallback((lineId: string) => {
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  }, []);

  const toggleAllCollapsed = React.useCallback(() => {
    if (hasCollapsedItems) {
      setCollapsedItems(new Set());
    } else {
      const allParentIds = new Set<string>();
      const findParents = (items: ProjectedLineItem[]) => {
        for (const item of items) {
          if (item.children.some((c) => c.name !== "")) {
            allParentIds.add(item.lineId);
            findParents(item.children);
          }
        }
      };
      findParents(Object.values(projectedState.items));
      setCollapsedItems(allParentIds);
    }
  }, [hasCollapsedItems, projectedState.items]);

  const [expandedCommits, setExpandedCommits] = React.useState<Set<string>>(
    new Set(),
  );
  const toggleCommitExpanded = React.useCallback((hash: string) => {
    setExpandedCommits((prev) => {
      const next = new Set(prev);
      if (next.has(hash)) next.delete(hash);
      else next.add(hash);
      return next;
    });
  }, []);

  const isComboChildItem = React.useMemo(() => {
    if (!noteItem || !noteItem.parentLineId) return false;
    const parent = projectedState.items[noteItem.parentLineId];
    if (!parent) return false;
    const parentEntry = catalog[parent.sku];
    return !!parentEntry?.comboChoices;
  }, [noteItem, projectedState.items, catalog]);

  // ─── Derived State ──────────────────────────────────────────────────────

  const rootItems = Object.values(projectedState.items).filter(
    (i) => !i.parentLineId,
  );

  const prevRootItemCount = React.useRef(rootItems.length);
  React.useEffect(() => {
    // Only scroll to the bottom if an item was added
    if (rootItems.length > prevRootItemCount.current) {
      checklistRef.current?.scrollTo({
        top: checklistRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    prevRootItemCount.current = rootItems.length;
  }, [rootItems.length]);

  const filteredRootItems = React.useMemo(() => {
    return rootItems.filter((item) => {
      if (hideCanceled && item.status === ItemStatus.Canceled) return false;

      const rawAssignAlloc = item.allocations
        .map((id) => projectedState.allocations[id])
        .find((a) => a?.type === AllocationType.Assignment) as any;
      const assigneeId = rawAssignAlloc
        ? rawAssignAlloc.allocationId
        : guests[0]?.id || "Guest";

      const rawPaymentAllocs = item.allocations
        .map((id) => projectedState.allocations[id])
        .filter(
          (a) => a?.type === AllocationType.Payment,
        ) as PaymentAllocation[];
      const payerIds =
        rawPaymentAllocs.length > 0
          ? rawPaymentAllocs.map((a) => {
            const rawPayer = a.payer;
            const matchedPayer = guests.find(
              (g) => g.id === rawPayer || g.alias === rawPayer,
            );
            return matchedPayer ? matchedPayer.id : rawPayer;
          })
          : [assigneeId];

      const matchesAssignee = visibleAssignees.has(assigneeId);
      const matchesPayer = payerIds.some((id) => visiblePayers.has(id));

      if (guestFilterOp === "AND") {
        return matchesAssignee && matchesPayer;
      } else {
        return matchesAssignee || matchesPayer;
      }
    });
  }, [
    rootItems,
    visibleAssignees,
    visiblePayers,
    projectedState.allocations,
    guests,
    hideCanceled,
    guestFilterOp,
  ]);

  const flattenedVisibleItems = React.useMemo(() => {
    const list: ProjectedLineItem[] = [];
    const traverse = (items: ProjectedLineItem[]) => {
      for (const item of items) {
        list.push(item);
        if (item.children) {
          traverse(item.children);
        }
      }
    };
    traverse(filteredRootItems);
    return list;
  }, [filteredRootItems]);

  const {
    selectedLineIds,
    setSelectedLineIds,
    handleSelectToggle,
    checklistRef,
    bulkActionsBarRef,
  } = usePostTerminalSelection(
    flattenedVisibleItems,
    visibleAssignees,
    visiblePayers,
    currentBranchName,
    viewingHash,
  );
  const prevItemsRef = React.useRef(projectedState.items);
  React.useEffect(() => {
    if (autoSelectLastClickedItem) {
      const prevItems = prevItemsRef.current;
      const currentItems = projectedState.items;
      const newIds = Object.keys(currentItems).filter((id) => !prevItems[id]);
      if (newIds.length > 0) {
        const newRootIds = newIds.filter((id) => !currentItems[id].parentLineId);
        if (newRootIds.length > 0) {
          if (isMultiSelectMode) {
            setSelectedLineIds(new Set([...selectedLineIds, ...newRootIds]));
          } else {
            setSelectedLineIds(new Set([newRootIds[newRootIds.length - 1]]));
          }
        }
      }
    }
    prevItemsRef.current = projectedState.items;
  }, [projectedState.items, autoSelectLastClickedItem, isMultiSelectMode, selectedLineIds, setSelectedLineIds]);

  const canceledCount = React.useMemo(() => {
    let count = 0;
    const countCanceled = (item: ProjectedLineItem) => {
      if (item.status === ItemStatus.Canceled) count++;
      else item.children.forEach(countCanceled);
    };
    for (const item of rootItems) {
      const rawAssignAlloc = item.allocations
        .map((id) => projectedState.allocations[id])
        .find((a) => a?.type === AllocationType.Assignment) as any;
      const assigneeId = rawAssignAlloc
        ? rawAssignAlloc.allocationId
        : guests[0]?.id || "Guest";

      const rawPaymentAllocs = item.allocations
        .map((id) => projectedState.allocations[id])
        .filter(
          (a) => a?.type === AllocationType.Payment,
        ) as PaymentAllocation[];
      const payerIds =
        rawPaymentAllocs.length > 0
          ? rawPaymentAllocs.map((a) => {
            const rawPayer = a.payer;
            const matchedPayer = guests.find(
              (g) => g.id === rawPayer || g.alias === rawPayer,
            );
            return matchedPayer ? matchedPayer.id : rawPayer;
          })
          : [assigneeId];

      const matchesAssignee = visibleAssignees.has(assigneeId);
      const matchesPayer = payerIds.some((id) => visiblePayers.has(id));

      let show = false;
      if (guestFilterOp === "AND") {
        show = matchesAssignee && matchesPayer;
      } else {
        show = matchesAssignee || matchesPayer;
      }

      if (show) {
        countCanceled(item);
      }
    }
    return count;
  }, [
    rootItems,
    projectedState.allocations,
    guests,
    visibleAssignees,
    visiblePayers,
    guestFilterOp,
  ]);

  const selectedItems = React.useMemo(
    () =>
      Array.from(selectedLineIds)
        .map((id) => projectedState.items[id])
        .filter(Boolean),
    [projectedState.items, selectedLineIds],
  );

  const catalogData = usePostTerminalCatalog(
    catalog,
    selectedItems,
    modifierAddItem,
    swapChoiceState,
    projectedState.items,
  );
  const {
    catalogItems,
    modifierItems,
    groupedCatalog,
    availableTags,
    compatibleModifiers,
    activeModifiersOnSelected,
  } = catalogData;

  const maxSelectedQty = React.useMemo(() => {
    return selectedItems.reduce((max, item) => Math.max(max, item.qty), 0);
  }, [selectedItems]);

  const selectedIncrement = React.useMemo(() => {
    if (selectedItems.length === 0) return 1;
    const firstInc = catalog[selectedItems[0].sku]?.mainQtyIncrement ?? 1;
    const allSame = selectedItems.every(
      (i) => (catalog[i.sku]?.mainQtyIncrement ?? 1) === firstInc,
    );
    return allSame ? firstInc : 1;
  }, [selectedItems, catalog]);

  const disableNonModActions = React.useMemo(() => {
    for (const id of selectedLineIds) {
      const item = projectedState.items[id as string];
      if (item && item.parentLineId) return true;
    }
    return false;
  }, [selectedLineIds, projectedState.items]);

  const selectedQtys = React.useMemo(() => {
    const qtys: number[] = [];
    for (const id of selectedLineIds) {
      const item = projectedState.items[id as string];
      if (item) qtys.push(item.qty);
    }
    return qtys;
  }, [selectedLineIds, projectedState.items]);

  const { canMerge, canBreak, canCombine } = React.useMemo(() => {
    let canMerge = false;
    let canBreak = false;
    let canCombine = false;

    if (selectedLineIds.size === 0) return { canMerge, canBreak, canCombine };

    const selectedItemsList = Array.from(selectedLineIds)
      .map((id) => projectedState.items[id as string])
      .filter(Boolean);

    // Check Merge
    if (selectedItemsList.length >= 2) {
      const getSignature = (item: any): string => {
        const childrenSig = item.children
          .filter((c: any) => c.status !== "canceled")
          .map((c: any) => getSignature(c))
          .sort()
          .join("|");
        const allocSig = [...item.allocations].sort().join(",");
        return `${item.sku}::${item.inlineQty}::${item.selectedModifierState}::${allocSig}::${childrenSig}`;
      };

      const sigs = new Set<string>();
      for (const item of selectedItemsList) {
        if (item.status !== "canceled") {
          const sig = getSignature(item);
          if (sigs.has(sig)) {
            const entry = catalog[item.sku];
            if (!entry?.inlineQtyMainQtyLocked) {
              canMerge = true;
              break;
            }
          }
          sigs.add(sig);
        }
      }
    }

    // Check Break
    for (const item of selectedItemsList) {
      if (item.status !== "canceled") {
        const entry = catalog[item.sku];
        if (entry?.comboChoices && entry.comboChoices.length > 0) {
          canBreak = true;
          break;
        }
      }
    }

    // Check Combine
    if (selectedItemsList.length >= 2) {
      const combos = Object.values(catalog).filter(
        (c) =>
          c.type === "item" &&
          c.category === "combo" &&
          c.comboChoices &&
          c.comboChoices.length > 0,
      );

      for (const combo of combos) {
        const increment = combo.mainQtyIncrement ?? 1;

        const slots: Record<
          string,
          Array<{ optionSku: string; reqQty: number }>
        > = {};
        for (const choice of combo.comboChoices!) {
          if (!slots[choice.slotSku]) slots[choice.slotSku] = [];
          slots[choice.slotSku].push({
            optionSku: choice.optionSku,
            reqQty: choice.qty ?? 1,
          });
        }
        const requiredSlots = Object.keys(slots);

        const availablePool = selectedItemsList
          .filter((item) => item.status !== "canceled")
          .map((item) => ({ sku: item.sku, qty: item.qty }));

        let matchedAll = true;
        for (const slotSku of requiredSlots) {
          const options = slots[slotSku];
          let matchedOption = false;

          for (const option of options) {
            const needed = option.reqQty * increment;
            const poolItemIdx = availablePool.findIndex(
              (p) => p.sku === option.optionSku && p.qty >= needed - 0.0001,
            );
            if (poolItemIdx !== -1) {
              availablePool[poolItemIdx].qty -= needed;
              matchedOption = true;
              break;
            }
          }

          if (!matchedOption) {
            matchedAll = false;
            break;
          }
        }

        if (matchedAll) {
          canCombine = true;
          break;
        }
      }
    }

    return { canMerge, canBreak, canCombine };
  }, [selectedLineIds, projectedState.items, catalog]);

  const log = commitLog();
  const confirmedHash = engine.getConfirmedHash();
  const branches = useVCSStore.getState().engine.getRepo().branches;
  const mainBranchName = mainActiveBranch();
  const isMergedToMain = React.useMemo(() => {
    if (currentBranchName === mainBranchName) return false;
    const currentHead = branches[currentBranchName]?.headHash;
    const mainHead = branches[mainBranchName]?.headHash;
    if (!currentHead || !mainHead || currentHead === mainHead) return false;
    return useVCSStore.getState().engine.isAncestorOf(currentHead, mainHead);
  }, [currentBranchName, mainBranchName, branches]);
  const graphData = React.useMemo(
    () =>
      buildCommitGraph(
        log,
        activeBranch(),
        mainActiveBranch(),
        expandedCommits,
        branches,
      ),
    [log, activeBranch, mainActiveBranch, expandedCommits, branches],
  );
  const isViewingHistory = viewingHash !== null && viewingHash !== headHash();

  const terminalActions = usePostTerminalActions({
    selectedPerson,
    resolveGuestName,
    storeGuests,
    orderContext,
    defaultPaymentMethod,
    selectedLineIds,
    setSelectedLineIds,
    groupNoteLineIds,
    viewingHash,
    historyOpDialog,
    setHistoryOpDialog,
    branchToConfig,
    noteItem,
    setNoteDialogOpen,
    setShowResetConfirm,
    setAddGuestOpen,
  });
  const {
    handleAddItem,
    handleRemoveNoteFromItems,
    handleCleanupStaleNotes,
    handleAttachNoteToOrder,
    handleResetOrder,
  } = terminalActions;

  const handleAddModifierInline = React.useCallback((sku: string, state?: string) => {
    if (selectedItems.length !== 1) return;
    addModifier(selectedItems[0].lineId, sku, state);
  }, [selectedItems, addModifier]);

  const handleRemoveModifierInline = React.useCallback((lineId: string) => {
    removeItem(lineId);
  }, [removeItem]);

  const handleUpdateModifierStateInline = React.useCallback((sku: string, state: string) => {
    if (selectedItems.length !== 1) return;
    const parentItem = selectedItems[0];
    const modifierChild = parentItem.children.find(c => c.sku === sku);
    if (modifierChild) {
      modifyModifierState(modifierChild.lineId, modifierChild.selectedModifierState, state);
    }
  }, [selectedItems, modifyModifierState]);

  const handleUpdateInlineQty = React.useCallback((sku: string, change: number) => {
    if (selectedItems.length !== 1) return;
    const item = selectedItems[0];
    // This handler can update either the main item's inline qty or a modifier's.
    const targetItem = item.sku === sku ? item : item.children.find(c => c.sku === sku);
    if (targetItem) {
      const currentQty = targetItem.inlineQty ?? 1;
      const newQty = currentQty + change;
      if (newQty > 0) {
        modifyItemInlineQty(targetItem.lineId, currentQty, newQty);
      }
    }
  }, [selectedItems, modifyItemInlineQty]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* ─── Header ────────────────────────────────────────────────────── */}
        <header className="border-b bg-card px-4 py-2.5 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <GitCommitHorizontal className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-sm font-bold tracking-tight">
                Retail VCS Terminal
              </h1>
              <p className="text-[10px] text-muted-foreground">
                Version-Controlled POS — Order as Repository
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(() => {
              const active = activeBranch();
              const main = mainActiveBranch();
              const pointer = branches[active];
              const isHypothetical = pointer?.type === "hypothetical";
              const branchCount = Object.keys(branches).length;
              const isMain = active === main;
              const isMerged =
                !isMain &&
                pointer?.headHash &&
                branches[main]?.headHash &&
                pointer.headHash !== branches[main].headHash &&
                useVCSStore
                  .getState()
                  .engine.isAncestorOf(
                    pointer.headHash,
                    branches[main].headHash,
                  );

              return (
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-7 gap-1.5 pr-2 ${isMain ? "border-primary/50 bg-primary/5 hover:bg-primary/10" : isMerged ? "border-muted-foreground/30 bg-muted/50 hover:bg-muted/70 text-muted-foreground" : isHypothetical ? "border-amber-400/50 bg-amber-500/5 hover:bg-amber-500/10" : "border-emerald-400/50 bg-emerald-500/5 hover:bg-emerald-500/10"}`}
                  onClick={() => setIsBranchManagerOpen(true)}
                >
                  {isMain ? (
                    <GitBranch className="w-3.5 h-3.5 text-primary shrink-0" />
                  ) : isMerged ? (
                    <Lock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  ) : isHypothetical ? (
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <GitBranch className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                  <span className="text-xs font-semibold max-w-30 truncate">
                    {pointer?.label || active}
                  </span>
                  {main !== active && (
                    <span className="text-[10px] text-muted-foreground font-normal">
                      · main: {branches[main]?.label || main}
                    </span>
                  )}
                  {branchCount > 1 && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] h-4 px-1.5 ml-0.5"
                    >
                      {branchCount}
                    </Badge>
                  )}
                  <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                </Button>
              );
            })()}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Guest:</span>
            <Button
              variant="outline"
              size="sm"
              className="h-auto py-1 gap-1.5 px-2.5 max-w-52.5"
              onClick={() => {
                setGuestPickerOpen(true);
              }}
              title={
                selectedGuestDescription
                  ? `Select guest (${selectedGuestDescription})`
                  : "Select guest"
              }
            >
              <User className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div className="flex flex-col items-start min-w-0 text-left">
                <span className="truncate text-xs leading-tight font-medium">
                  {selectedGuestLabel}
                </span>
                {selectedGuestDescription && (
                  <span className="text-[8px] text-muted-foreground/75 truncate max-w-30 leading-tight font-normal italic">
                    {selectedGuestDescription}
                  </span>
                )}
              </div>
              <Badge
                variant="secondary"
                className="h-4 px-1 text-[9px] shrink-0"
              >
                {selectedGuestCount}
              </Badge>
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 px-2.5 max-w-52.5"
              onClick={() => {
                setPaymentAllocationItems([]);
                setPaymentAllocationContext(AllocationContext.Header);
                setPaymentAllocationOpen(true);
              }}
              title="Configure order default payment"
            >
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{currentConfigName}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 px-2.5 max-w-52.5"
              onClick={() => {
                setFulfillmentAllocationItems([]);
                setFulfillmentAllocationContext(AllocationContext.Global);
                setFulfillmentAllocationOpen(true);
              }}
              title="Configure order default fulfillment"
            >
              <Clock className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">{currentFulfillmentConfigName}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            </Button>
            <SeparatorUI orientation="vertical" className="h-6" />
            <SeparatorUI orientation="vertical" className="h-6" />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2 text-muted-foreground"
              onClick={() => setGlobalSettingsOpen(true)}
              title="Global Settings"
            >
              <Settings2 className="w-3 h-3 mr-1" />
              Settings
            </Button>
            {showResetConfirm ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-destructive">
                  End this order?
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={handleResetOrder}
                >
                  Confirm
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 text-muted-foreground"
                onClick={() => setShowResetConfirm(true)}
              >
                <XCircle className="w-3 h-3 mr-1" />
                New Order
              </Button>
            )}
          </div>
        </header>

        {orderContext && (
          <OrderContextBanner
            context={orderContext}
            onEditClick={handleOpenCustomerDialog}
          >
            <ActiveCheckActionFilterBar
              activeBranch={activeBranch()}
              isViewingHistory={isViewingHistory}
              guests={guests}
              visibleAssignees={visibleAssignees}
              setVisibleAssignees={setVisibleAssignees}
              visiblePayers={visiblePayers}
              setVisiblePayers={setVisiblePayers}
              toggleAllCollapsed={toggleAllCollapsed}
              hasCollapsedItems={hasCollapsedItems}
              hideCanceled={hideCanceled}
              setHideCanceled={setHideCanceled}
              canceledCount={canceledCount}
              detailLevel={detailLevel}
              setDetailLevel={setDetailLevel}
              guestFilterOp={guestFilterOp}
              setGuestFilterOp={setGuestFilterOp}
              isCompactMode={isCompactMode}
              setIsCompactMode={setIsCompactMode}
              isBulkActionsCollapsed={isBulkActionsCollapsed}
              setIsBulkActionsCollapsed={setIsBulkActionsCollapsed}
              isGroupNotesCollapsed={isGroupNotesCollapsed}
              setIsGroupNotesCollapsed={setIsGroupNotesCollapsed}
              isLedgerCollapsed={isLedgerCollapsed}
              setIsLedgerCollapsed={setIsLedgerCollapsed}
            />
          </OrderContextBanner>
        )}

        {/* ─── Main Content: 3-Panel Layout ─────────────────────────────── */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <CatalogPanel
            catalogItems={catalogItems}
            groupedCatalog={groupedCatalog}
            availableTags={availableTags}
            iconConfigs={iconConfigs}
            onAddItem={handleAddItem}
          />
          <ActiveCheckPanel
            activeBranch={activeBranch()}
            mainBranchName={mainBranchName}
            isMergedToMain={isMergedToMain}
            isViewingHistory={isViewingHistory}
            projectedState={projectedState}
            guests={guests}
            resolveGuestName={resolveGuestName}
            toggleAllCollapsed={toggleAllCollapsed}
            hasCollapsedItems={hasCollapsedItems}
            hideCanceled={hideCanceled}
            setHideCanceled={setHideCanceled}
            canceledCount={canceledCount}
            detailLevel={detailLevel}
            isCompactMode={isCompactMode}
            isMultiSelectMode={isMultiSelectMode}
            setDetailLevel={setDetailLevel}
            selectedPerson={selectedPerson}
            filteredRootItems={filteredRootItems}
            resolvedAllocations={resolvedAllocations}
            defaultPaymentAllocId={defaultPaymentAllocId}
            removeItem={removeItem}
            handleOpenModifierDialog={handleOpenModifierDialog}
            handleOpenNoteDialog={handleOpenNoteDialog}
            handleAllocConfig={handleAllocConfig}
            handleOpenSwapDialog={handleOpenSwapDialog}
            modifierItems={modifierItems}
            selectedLineIds={selectedLineIds}
            setSelectedLineIds={setSelectedLineIds}
            handleSelectToggle={handleSelectToggle}
            collapsedItems={collapsedItems}
            handleToggleCollapse={handleToggleCollapse}
            checklistRef={checklistRef}
          />
          <InlineModifierPanel
            selectedItems={selectedItems}
            catalog={catalog}
            compatibleModifiers={compatibleModifiers}
            onAddModifier={handleAddModifierInline}
            onRemoveModifier={handleRemoveModifierInline}
            onUpdateModifierState={handleUpdateModifierStateInline}
            onUpdateInlineQty={handleUpdateInlineQty}
          />
          <BulkActionsPanel
            selectedLineIds={selectedLineIds}
            setSelectedLineIds={setSelectedLineIds}
            filteredRootItems={filteredRootItems}
            parsedStep={parsedStep}
            qtyStep={qtyStep}
            setQtyStep={setQtyStep}
            setQtyStepPadOpen={setQtyStepPadOpen}
            setQtyPadOpen={setQtyPadOpen}
            setSplitQtyDialogOpen={setSplitQtyDialogOpen}
            setSplitLineDialogOpen={setSplitLineDialogOpen}
            setDupMoveDialogOpen={setDupMoveDialogOpen}
            setCombineDialogOpen={setCombineDialogOpen}
            setAssignmentAllocationItems={setAssignmentAllocationItems}
            setAssignmentAllocationContext={setAssignmentAllocationContext}
            setAssignmentAllocationOpen={setAssignmentAllocationOpen}
            setPaymentAllocationItems={setPaymentAllocationItems}
            setPaymentAllocationContext={setPaymentAllocationContext}
            setPaymentAllocationOpen={setPaymentAllocationOpen}
            setFulfillmentAllocationItems={setFulfillmentAllocationItems}
            setFulfillmentAllocationContext={setFulfillmentAllocationContext}
            setFulfillmentAllocationOpen={setFulfillmentAllocationOpen}
            compatibleModifiers={compatibleModifiers}
            setModifierAddItem={setModifierAddItem}
            setModifierAddOpen={setModifierAddOpen}
            activeModifiersOnSelected={activeModifiersOnSelected}
            onGroupNoteOpen={handleOpenGroupNoteDialog}
            modifyItemsQty={modifyItemsQty}
            duplicateItems={duplicateItems}
            removeItems={removeItems}
            mergeItems={mergeItems}
            breakItems={breakItems}
            disableNonModActions={disableNonModActions}
            canMerge={canMerge}
            canBreak={canBreak}
            canCombine={canCombine}
            formatNumber={formatNumber}
            projectedState={projectedState}
            isBulkActionsCollapsed={isBulkActionsCollapsed}
            setIsBulkActionsCollapsed={setIsBulkActionsCollapsed}
            isMultiSelectMode={isMultiSelectMode}
            setIsMultiSelectMode={setIsMultiSelectMode}
            autoSelectLastClickedItem={autoSelectLastClickedItem}
            setAutoSelectLastClickedItem={setAutoSelectLastClickedItem}
          />
          <GroupNotesPanel
            projectedState={projectedState}
            onRemoveNoteFromItems={handleRemoveNoteFromItems}
            onCleanupStaleNotes={handleCleanupStaleNotes}
            onAttachNoteToOrder={handleAttachNoteToOrder}
            isGroupNotesCollapsed={isGroupNotesCollapsed}
            setIsGroupNotesCollapsed={setIsGroupNotesCollapsed}
          />
          <CommitLedgerPanel
            isLedgerCollapsed={isLedgerCollapsed}
            setIsLedgerCollapsed={setIsLedgerCollapsed}
            log={log}
            viewingHash={viewingHash}
            headHash={headHash()}
            isViewingHistory={isViewingHistory}
            viewRevision={viewRevision}
            graphData={graphData}
            expandedCommits={expandedCommits}
            toggleCommitExpanded={toggleCommitExpanded}
            checkoutBranch={checkoutBranch}
            activeBranch={activeBranch()}
            branches={branches}
            setHistoryOpDialog={setHistoryOpDialog}
            engine={engine}
            confirmedHash={confirmedHash}
          />
        </div>

        {/* ─── Footer ──────────────────────────────────────────────────── */}
        <footer className="border-t bg-card px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
          <span>VCS-Retail v2.0.0-PRO MVP</span>
          <span>
            Shared Allocations · Payment Splits · Late-Bound Pricing ·
            Append-Only Ledger
          </span>
        </footer>
      </div>

      {/* ─── Dialogs ─────────────────────────────────────────────────── */}
      <PosAllocationDialogs
        dialogs={allocationDialogs}
        actions={terminalActions}
        configs={terminalConfigs}
        projectedState={projectedState}
        orderContext={orderContext}
        guests={guests}
        resolveGuestName={resolveGuestName}
        selectedPerson={selectedPerson}
        floorConfigs={floorConfigs}
        setSelectedLineIds={setSelectedLineIds}
        defaultPaymentMethod={defaultPaymentMethod}
        defaultPaymentAllocId={defaultPaymentAllocId}
        activePaymentConfigId={activePaymentConfigId}
        activeFulfillmentConfigId={activeFulfillmentConfigId}
      />
      <PosGuestDialogs
        dialogs={baseDialogs}
        actions={terminalActions}
        selectedPerson={selectedPerson}
        setSelectedPerson={setSelectedPerson}
      />
      <PosChoiceDialogs
        dialogs={baseDialogs}
        qtyDialogs={qtyDialogs}
        catalogData={catalogData}
        guestChoiceOptions={guestChoiceOptions}
        selectedLineIds={selectedLineIds}
        setSelectedLineIds={setSelectedLineIds}
      />
      <PosQtyDialogs
        dialogs={qtyDialogs}
        actions={terminalActions}
        selectedItemsLength={selectedItems.length}
        firstSelectedQty={
          selectedItems.length === 1 ? selectedItems[0].qty : null
        }
        maxSelectedQty={maxSelectedQty}
        increment={selectedIncrement}
      />
      <PosBranchDialogs
        dialogs={branchDialogs}
        actions={terminalActions}
        activeBranch={currentBranchName}
        viewingHash={viewingHash}
        serverName={orderContext?.serverName || "default"}
        resolveGuestName={resolveGuestName}
      />
      <PosOtherDialogs
        dialogs={baseDialogs}
        actions={terminalActions}
        catalogData={catalogData}
        orderContext={orderContext}
        isComboChildItem={isComboChildItem}
        selectedLineIdsSize={selectedLineIds.size}
        selectedLineIdsArray={Array.from(selectedLineIds)}
      />
      <GlobalSettingsDialog
        open={globalSettingsOpen}
        onOpenChange={setGlobalSettingsOpen}
      />
      <CombineDialog
        open={combineDialogOpen}
        onOpenChange={setCombineDialogOpen}
        selectedItems={Array.from(selectedLineIds)
          .map((id) => projectedState.items[id as string])
          .filter(Boolean)}
        catalog={useVCSStore.getState().catalog}
        onCombine={(requests) => {
          const newIds = combineItems(requests);
          if (newIds && newIds.length > 0) setSelectedLineIds(new Set(newIds));
        }}
      />
      <SplitIntoLinesDialog
        open={splitLineDialogOpen}
        onOpenChange={setSplitLineDialogOpen}
        maxQty={maxSelectedQty}
        selectedQtys={selectedQtys}
        increment={selectedIncrement}
        onConfirm={(val) => {
          const newIds = splitItemsIntoIncrements(
            Array.from(selectedLineIds),
            val,
          );
          if (newIds && newIds.length > 0) setSelectedLineIds(new Set(newIds));
        }}
      />
      <NumberPadDialog
        open={qtyStepPadOpen}
        onOpenChange={setQtyStepPadOpen}
        title="Quantity Increment"
        description="Set the increment step for bulk quantity adjustments"
        initialValue={qtyStep === "" ? 1 : Number(qtyStep)}
        min={selectedIncrement}
        increment={selectedIncrement}
        onConfirm={(val) => setQtyStep(val)}
      />
    </TooltipProvider>
  );
}
