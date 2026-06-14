"use client";

import { buildCommitGraph } from "@/lib/vcs/graph";
import { useVCSStore } from "@/store/vcs-store";
import React from "react";

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
import { PosMiscDialogs } from "@/components/pos/screens/dialogs/pos-misc-dialogs";

import { ActiveCheckActionFilterBar } from "@/components/pos/bars/active-check-action-filter-bar";
import { ActiveCheckPanel } from "@/components/pos/panels/active-check-panel";
import { CatalogPanel } from "@/components/pos/panels/catalog-panel";
import { CommitLedgerPanel } from "@/components/pos/panels/commit-ledger-panel";
import { GroupNotesPanel } from "@/components/pos/panels/group-notes-panel";

import { OrderContextBanner } from "@/components/pos/bars/order-context-banner";
import { PosQtyDialogs } from "@/components/pos/screens/dialogs/pos-qty-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator as SeparatorUI } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AllocationContext,
  type FloorConfig,
  type OrderTypeConfig,
  ViewMode
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
  Lightbulb,
  Lock,
  User,
  XCircle,
} from "lucide-react";

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
  } = useVCSStore();
  const iconConfigs = useVCSStore((state) => state.iconConfigs);

  // ─── Dynamic Guest List ─────────────────────────────────────────────
  const currentBranchName = activeBranch();

  const terminalGuests = usePostTerminalGuests(projectedState.allocations, defaultAssignmentAllocId);
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
  const {
    setQtyPadOpen,
    setSplitQtyDialogOpen,
    setDupMoveDialogOpen,
  } = qtyDialogs;

  const branchDialogs = usePostTerminalBranchDialogs();
  const {
    historyOpDialog,
    setHistoryOpDialog,
    setIsBranchManagerOpen,
    branchToConfig,
    showResetConfirm,
    setShowResetConfirm,
  } = branchDialogs;

  const [isLedgerCollapsed, setIsLedgerCollapsed] = React.useState(true);
  const [isGroupNotesCollapsed, setIsGroupNotesCollapsed] =
    React.useState(true);
  const [collapsedItems, setCollapsedItems] = React.useState<Set<string>>(
    new Set(),
  );
  const [detailLevel, setDetailLevel] = React.useState<
    ViewMode
  >(ViewMode.Simple);
  const [hideCanceled, setHideCanceled] = React.useState(false);

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
      const assigneeId = rawAssignAlloc ? rawAssignAlloc.allocationId : (guests[0]?.id || "Guest");

      const rawPaymentAllocs = item.allocations
        .map((id) => projectedState.allocations[id])
        .filter((a) => a?.type === AllocationType.Payment) as PaymentAllocation[];
      const payerIds = rawPaymentAllocs.length > 0
        ? rawPaymentAllocs.map((a) => {
          const rawPayer = a.payer;
          const matchedPayer = guests.find((g) => g.id === rawPayer || g.alias === rawPayer);
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

  const {
    selectedLineIds,
    setSelectedLineIds,
    handleSelectToggle,
    checklistRef,
    bulkActionsBarRef,
  } = usePostTerminalSelection(
    filteredRootItems,
    visibleAssignees,
    visiblePayers,
    currentBranchName,
    viewingHash,
  );

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
      const assigneeId = rawAssignAlloc ? rawAssignAlloc.allocationId : (guests[0]?.id || "Guest");

      const rawPaymentAllocs = item.allocations
        .map((id) => projectedState.allocations[id])
        .filter((a) => a?.type === AllocationType.Payment) as PaymentAllocation[];
      const payerIds = rawPaymentAllocs.length > 0
        ? rawPaymentAllocs.map((a) => {
          const rawPayer = a.payer;
          const matchedPayer = guests.find((g) => g.id === rawPayer || g.alias === rawPayer);
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
    () => rootItems.filter((item) => selectedLineIds.has(item.lineId)),
    [rootItems, selectedLineIds],
  );

  const catalogData = usePostTerminalCatalog(
    catalog,
    selectedItems,
    modifierAddItem,
    swapChoiceState,
    projectedState.items
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
            bulkActionsBarRef={bulkActionsBarRef}
            modifyItemsQty={modifyItemsQty}
            setQtyPadOpen={setQtyPadOpen}
            setSplitQtyDialogOpen={setSplitQtyDialogOpen}
            duplicateItems={duplicateItems}
            setDupMoveDialogOpen={setDupMoveDialogOpen}
            removeItems={removeItems}
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
            setRemoveModDialogOpen={setRemoveModDialogOpen}
            onGroupNoteOpen={handleOpenGroupNoteDialog}
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
        firstSelectedQty={selectedItems.length === 1 ? selectedItems[0].qty : null}
        maxSelectedQty={maxSelectedQty}
      />
      <PosBranchDialogs
        dialogs={branchDialogs}
        actions={terminalActions}
        activeBranch={currentBranchName}
        viewingHash={viewingHash}
        serverName={orderContext?.serverName || "default"}
        resolveGuestName={resolveGuestName}
      />
      <PosMiscDialogs
        dialogs={baseDialogs}
        actions={terminalActions}
        catalogData={catalogData}
        orderContext={orderContext}
        isComboChildItem={isComboChildItem}
        selectedLineIdsSize={selectedLineIds.size}
        selectedLineIdsArray={Array.from(selectedLineIds)}
      />
    </TooltipProvider>
  );
}
