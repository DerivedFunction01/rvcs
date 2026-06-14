"use client";

import { AllocationConfigDialog } from "@/components/pos/dialogs/allocation-config-dialog";
import { AssignmentAllocationDialog } from "@/components/pos/dialogs/assignment-allocation-dialog";
import { BranchConfigDialog } from "@/components/pos/dialogs/branch-config-dialog";
import { BranchManagerDialog } from "@/components/pos/dialogs/branch-manager-dialog";
import {
  ChoiceDialog,
} from "@/components/pos/dialogs/choice-dialog";
import { FulfillmentAllocationDialog } from "@/components/pos/dialogs/fulfillment-allocation-dialog";
import { MergeBranchDialog } from "@/components/pos/dialogs/merge-dialog";
import { ModifierAddDialog } from "@/components/pos/dialogs/modifier-add-dialog";
import { NumberPadDialog } from "@/components/pos/dialogs/number-pad-dialog";
import { PaymentAllocationDialog } from "@/components/pos/dialogs/payment-allocation-dialog";
import { SplitQtyDialog } from "@/components/pos/dialogs/split-qty-dialog";
import { buildCommitGraph } from "@/lib/vcs/graph";
import { useVCSStore } from "@/store/vcs-store";
import React from "react";

import { usePostTerminalGuests } from "@/components/pos/screens/hooks/use-post-terminal-guests";
import { usePostTerminalSelection } from "@/components/pos/screens/hooks/use-post-terminal-selection";
import { usePostTerminalDialogs } from "@/components/pos/screens/hooks/use-post-terminal-dialogs";
import { usePostTerminalCatalog } from "@/components/pos/screens/hooks/use-post-terminal-catalog";
import { usePostTerminalConfigs } from "@/components/pos/screens/hooks/use-post-terminal-configs";
import { usePostTerminalAllocationDialogs } from "@/components/pos/screens/hooks/use-post-terminal-allocation-dialogs";
import { usePostTerminalQtyDialogs } from "@/components/pos/screens/hooks/use-post-terminal-qty-dialogs";
import { usePostTerminalBranchDialogs } from "@/components/pos/screens/hooks/use-post-terminal-branch-dialogs";
import { usePostTerminalActions } from "@/components/pos/screens/hooks/use-post-terminal-actions";

import { ActiveCheckActionFilterBar } from "@/components/pos/bars/active-check-action-filter-bar";
import { ActiveCheckPanel } from "@/components/pos/panels/active-check-panel";
import { CatalogPanel } from "@/components/pos/panels/catalog-panel";
import { CommitLedgerPanel } from "@/components/pos/panels/commit-ledger-panel";
import { CustomerEditDialog } from "@/components/pos/dialogs/customer-edit-dialog";
import { GroupNoteDialog } from "@/components/pos/dialogs/group-note-dialog";
import { GroupNotesPanel } from "@/components/pos/panels/group-notes-panel";
import {
  AddGuestDialog,
  EditGuestDialog,
  GuestPickerDialog,
} from "@/components/pos/dialogs/guest-dialogs";
import { HistoryOpDialog } from "@/components/pos/dialogs/history-op-dialog";
import { NoteDialog } from "@/components/pos/dialogs/note-dialog";

import { OrderContextBanner } from "@/components/pos/bars/order-context-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator as SeparatorUI } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AllocationContext,
  ConfigUpdateMode,
  type FloorConfig,
  type OrderTypeConfig,
  PaymentUpdateMode,
  ViewMode,
} from "@/lib/pos/types";
import { generateAllocationId } from "@/lib/vcs/id";
import {
  AllocationType,
  BranchType,
  type Delta,
  DeltaActionType,
  type FulfillmentAllocation,
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
import { toast } from "sonner";

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
    addModifier,
    removeItem,
    checkoutBranch,
    viewRevision,
    mainActiveBranch,
    orderContext,
    defaultPaymentMethod,
    defaultPaymentAllocId,
    defaultAssignmentAllocId,
    changeDefaultPayment,
    updateFulfillmentAllocation,
    swapComboChoice,
    activePaymentConfigId,
    activeFulfillmentConfigId,
    selectPaymentConfig,
    selectFulfillmentConfig,
    createTableSplitConfig,
    duplicateItems,
    duplicateAndReassignItems,
    removeItems,
    modifyItemsQty,
    reassignItems,
    groupItemsPaymentConfig,
    addGroupModifier,
    removeGroupModifier,
    previewMerge,
    commitMerge,
  } = useVCSStore();
  const iconConfigs = useVCSStore((state) => state.iconConfigs);

  // ─── Dynamic Guest List ─────────────────────────────────────────────
  const currentBranchName = activeBranch();

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
  } = usePostTerminalGuests(projectedState.allocations, defaultAssignmentAllocId);

  const {
    resolvedAllocations,
    paymentConfigs,
    currentConfigName,
    currentFulfillmentConfigName,
  } = usePostTerminalConfigs({
    projectedState,
    activePaymentConfigId,
    activeFulfillmentConfigId,
    defaultPaymentAllocId,
    orderContext,
    resolveGuestName,
  });

  const {
    addGuestOpen,
    setAddGuestOpen,
    editGuestOpen,
    setEditGuestOpen,
    guestToEdit,
    setGuestToEdit,
    guestPickerOpen,
    setGuestPickerOpen,
    removeModDialogOpen,
    setRemoveModDialogOpen,
    groupNoteOpen,
    setGroupNoteOpen,
    groupNoteLineIds,
    customerDialogOpen,
    setCustomerDialogOpen,
    modifierAddOpen,
    setModifierAddOpen,
    modifierAddItem,
    setModifierAddItem,
    swapChoiceState,
    setSwapChoiceState,
    retainModifiersDuringSwap,
    setRetainModifiersDuringSwap,
    noteDialogOpen,
    setNoteDialogOpen,
    noteItem,
    handleOpenCustomerDialog,
    handleOpenModifierDialog,
    handleOpenSwapDialog,
    handleOpenNoteDialog,
    handleOpenAddGuestDialog,
    handleOpenGroupNoteDialog,
  } = usePostTerminalDialogs();

  const {
    allocConfigItem,
    setAllocConfigItem,
    assignmentAllocationOpen,
    setAssignmentAllocationOpen,
    assignmentAllocationContext,
    setAssignmentAllocationContext,
    assignmentAllocationItems,
    setAssignmentAllocationItems,
    paymentAllocationOpen,
    setPaymentAllocationOpen,
    paymentAllocationContext,
    setPaymentAllocationContext,
    paymentAllocationItems,
    setPaymentAllocationItems,
    fulfillmentAllocationOpen,
    setFulfillmentAllocationOpen,
    fulfillmentAllocationContext,
    setFulfillmentAllocationContext,
    fulfillmentAllocationItems,
    setFulfillmentAllocationItems,
    handleAllocConfig,
  } = usePostTerminalAllocationDialogs();

  const {
    qtyPadOpen,
    setQtyPadOpen,
    splitQtyDialogOpen,
    setSplitQtyDialogOpen,
    dupMoveDialogOpen,
    setDupMoveDialogOpen,
  } = usePostTerminalQtyDialogs();

  const {
    historyOpDialog,
    setHistoryOpDialog,
    isBranchManagerOpen,
    setIsBranchManagerOpen,
    isBranchConfigOpen,
    setIsBranchConfigOpen,
    branchToConfig,
    setBranchToConfig,
    isMergeOpen,
    setIsMergeOpen,
    showResetConfirm,
    setShowResetConfirm,
  } = usePostTerminalBranchDialogs();

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

  const {
    catalogItems,
    modifierItems,
    groupedCatalog,
    availableTags,
    compatibleModifiers,
    singleItemCompatibleModifiers,
    activeModifiersOnSelected,
    removeModChoiceOptions,
    swapOptions,
    slotName,
  } = usePostTerminalCatalog(
    catalog,
    selectedItems,
    modifierAddItem,
    swapChoiceState,
    projectedState.items
  );

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

  const {
    handleConfirmHistoryOp,
    handleSaveCustomerFields,
    handleSaveBranchConfig,
    handleSaveNote,
    handleAddGuestFromDialog,
    handleAddItem,
    handleReassign,
    handleSplitPayment,
    handleResetToDefault,
    handleSetBulkQty,
    handleSplitQty,
    handleSaveGroupNote,
    handleRemoveNoteFromItems,
    handleCleanupStaleNotes,
    handleAttachNoteToOrder,
    handleCreateBranch,
    handleResetOrder,
  } = usePostTerminalActions({
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

        {/* ─── Customer Info Edit Dialog ──────────────────────────────── */}
        <CustomerEditDialog
          open={customerDialogOpen}
          onOpenChange={setCustomerDialogOpen}
          orderType={orderContext?.orderType}
          customerFields={orderContext?.customerFields || {}}
          onSave={handleSaveCustomerFields}
        />

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
      <HistoryOpDialog
        open={!!historyOpDialog}
        onOpenChange={(open) => {
          if (!open) setHistoryOpDialog(null);
        }}
        operation={historyOpDialog}
        onConfirm={handleConfirmHistoryOp}
      />

      <AllocationConfigDialog
        open={!!allocConfigItem}
        onOpenChange={(open) => {
          if (!open) setAllocConfigItem(null);
        }}
        item={allocConfigItem}
        allocations={resolvedAllocations}
        defaultPaymentAllocId={defaultPaymentAllocId}
        defaultPaymentMethod={defaultPaymentMethod}
        onResetToDefault={handleResetToDefault}
        onTriggerAssignmentAllocation={(item) => {
          setAssignmentAllocationItems([item]);
          setAssignmentAllocationContext(AllocationContext.Item);
          setAssignmentAllocationOpen(true);
        }}
        onTriggerPaymentAllocation={(item) => {
          setPaymentAllocationItems([item]);
          setPaymentAllocationContext(AllocationContext.Item);
          setPaymentAllocationOpen(true);
        }}
        onTriggerFulfillmentAllocation={(item) => {
          setFulfillmentAllocationItems([item]);
          setFulfillmentAllocationContext(AllocationContext.Item);
          setFulfillmentAllocationOpen(true);
        }}
        initiatedAt={orderContext?.initiatedAt}
      />

      <AssignmentAllocationDialog
        open={assignmentAllocationOpen}
        onOpenChange={setAssignmentAllocationOpen}
        context={assignmentAllocationContext}
        items={assignmentAllocationItems}
        allocations={projectedState.allocations}
        guests={guests}
        onApplyConfig={(guestIds) => {
          if (assignmentAllocationContext === AllocationContext.Item) {
            handleReassign(assignmentAllocationItems[0].lineId, guestIds);
          } else {
            reassignItems(
              assignmentAllocationItems.map((i) => i.lineId),
              guestIds,
            );
            const displayNames = guestIds
              .split(",")
              .map((id) => resolveGuestName(id))
              .join(" + ");
            toast.success(
              `Assigned selected ${assignmentAllocationItems.length} items to ${displayNames}`,
            );
            setSelectedLineIds(new Set());
          }
        }}
        onAddGuest={handleAddGuestFromDialog}
      />

      <PaymentAllocationDialog
        open={paymentAllocationOpen}
        onOpenChange={setPaymentAllocationOpen}
        context={paymentAllocationContext}
        items={paymentAllocationItems}
        allocations={resolvedAllocations}
        defaultPaymentAllocId={defaultPaymentAllocId}
        defaultPaymentMethod={defaultPaymentMethod}
        paymentConfigs={paymentConfigs}
        activePaymentConfigId={activePaymentConfigId}
        selectedGuestName={resolveGuestName(selectedPerson)}
        allItems={Object.values(projectedState.items)}
        onApplyConfig={(configIdOrMethod, mode) => {
          if (paymentAllocationContext === AllocationContext.Item) {
            groupItemsPaymentConfig(
              [paymentAllocationItems[0].lineId],
              configIdOrMethod,
            );
            toast.success("Payment config updated for item");
          } else if (paymentAllocationContext === AllocationContext.Group) {
            groupItemsPaymentConfig(
              paymentAllocationItems.map((i) => i.lineId),
              configIdOrMethod,
            );
            toast.success(
              `Payment config updated for ${paymentAllocationItems.length} selected items`,
            );
            setSelectedLineIds(new Set());
          } else {
            if (configIdOrMethod.startsWith("group-default-")) {
              changeDefaultPayment(
                configIdOrMethod.replace("group-default-", ""),
                mode as ConfigUpdateMode,
              );
            } else {
              selectPaymentConfig(configIdOrMethod, mode as ConfigUpdateMode);
            }
            let targetName = configIdOrMethod.startsWith("group-default-")
              ? `(${configIdOrMethod.replace("group-default-", "").toUpperCase()})`
              : paymentConfigs.find((c) => c.id === configIdOrMethod)?.name;
            if (!targetName) {
              const representativeAlloc = Object.values(
                projectedState.allocations,
              ).find(
                (a) =>
                  a.type === AllocationType.Payment &&
                  ((a as PaymentAllocation).allocationId === configIdOrMethod ||
                    (a as PaymentAllocation).correlationId ===
                      configIdOrMethod),
              ) as PaymentAllocation | undefined;
              if (representativeAlloc) {
                targetName = `${resolveGuestName(representativeAlloc.payer)} (${(representativeAlloc.method || "").toUpperCase()})`;
              } else {
                targetName = "Selected Config";
              }
            }
            if (mode === ConfigUpdateMode.ChangeExisting) {
              toast.success(`All items switched to ${targetName}`);
            } else {
              toast.success(`Default set to ${targetName} for new items`);
            }
          }
        }}
        onApplyCustomSplit={(splits, mode) => {
          if (paymentAllocationContext === AllocationContext.Item) {
            handleSplitPayment(
              paymentAllocationItems[0].lineId,
              splits,
              mode as PaymentUpdateMode,
            );
          } else if (paymentAllocationContext === AllocationContext.Group) {
            const corrId = createTableSplitConfig(splits);
            groupItemsPaymentConfig(
              paymentAllocationItems.map((i) => i.lineId),
              corrId,
            );
            toast.success(
              `Custom split applied to ${paymentAllocationItems.length} selected items`,
            );
            setSelectedLineIds(new Set());
          } else {
            const corrId = createTableSplitConfig(splits);
            selectPaymentConfig(corrId, mode as ConfigUpdateMode);
            if (mode === ConfigUpdateMode.ChangeExisting)
              toast.success("Custom split applied to all existing items");
            else toast.success("Custom split set as default for new items");
          }
        }}
      />

      <FulfillmentAllocationDialog
        open={fulfillmentAllocationOpen}
        onOpenChange={setFulfillmentAllocationOpen}
        context={fulfillmentAllocationContext}
        items={fulfillmentAllocationItems}
        allocations={projectedState.allocations}
        activeFulfillmentConfigId={activeFulfillmentConfigId}
        allItems={Object.values(projectedState.items)}
        floorConfigs={floorConfigs}
        guests={guests}
        onApplyFulfillmentConfig={(selection, mode) => {
          if (fulfillmentAllocationContext === AllocationContext.Item) {
            if (selection.type === "config") {
              const matchedAllocs = Object.values(
                projectedState.allocations,
              ).filter(
                (a): a is FulfillmentAllocation =>
                  a.type === AllocationType.Fulfillment &&
                  (a.allocationId === selection.configId ||
                    a.correlationId === selection.configId),
              );
              if (matchedAllocs.length > 0) {
                const targetAllocIds = matchedAllocs.map((a) => a.allocationId);
                const item =
                  projectedState.items[fulfillmentAllocationItems[0].lineId];
                if (item) {
                  const nonFulAllocs = item.allocations.filter(
                    (id) =>
                      projectedState.allocations[id]?.type !==
                      AllocationType.Fulfillment,
                  );
                  useVCSStore.getState().commitDeltas(
                    [
                      {
                        action: DeltaActionType.ModifyItemAllocations,
                        lineId: item.lineId,
                        beforeAllocations: item.allocations,
                        afterAllocations: [...nonFulAllocs, ...targetAllocIds],
                      },
                    ],
                    "pos-ui",
                  );
                  toast.success("Fulfillment configuration updated for item");
                }
              }
            } else if (selection.type === "custom" && selection.customConfig) {
              const c = selection.customConfig;
              updateFulfillmentAllocation(
                fulfillmentAllocationItems[0].lineId,
                c.timeType,
                c.calculatedAt,
                c.method,
                c.destinationLabel,
                c.destinationId,
              );
              toast.success("Fulfillment updated for item");
            }
          } else if (fulfillmentAllocationContext === AllocationContext.Group) {
            if (selection.type === "config") {
              const matchedAllocs = Object.values(
                projectedState.allocations,
              ).filter(
                (a): a is FulfillmentAllocation =>
                  a.type === AllocationType.Fulfillment &&
                  (a.allocationId === selection.configId ||
                    a.correlationId === selection.configId),
              );
              if (matchedAllocs.length > 0) {
                const targetAllocIds = matchedAllocs.map((a) => a.allocationId);
                const targetItemIds = fulfillmentAllocationItems.map(
                  (i) => i.lineId,
                );
                const deltas: Delta[] = [];
                for (const lineId of targetItemIds) {
                  const item = projectedState.items[lineId];
                  if (item) {
                    const nonFulAllocs = item.allocations.filter(
                      (id) =>
                        projectedState.allocations[id]?.type !==
                        AllocationType.Fulfillment,
                    );
                    deltas.push({
                      action: DeltaActionType.ModifyItemAllocations,
                      lineId,
                      beforeAllocations: item.allocations,
                      afterAllocations: [...nonFulAllocs, ...targetAllocIds],
                    });
                  }
                }
                useVCSStore.getState().commitDeltas(deltas, "pos-ui");
                toast.success(
                  `Fulfillment updated for ${fulfillmentAllocationItems.length} items`,
                );
                setSelectedLineIds(new Set());
              }
            } else if (selection.type === "custom" && selection.customConfig) {
              const c = selection.customConfig;
              const newFulId = generateAllocationId(AllocationType.Fulfillment);
              const newFulAlloc: FulfillmentAllocation = {
                allocationId: newFulId,
                type: AllocationType.Fulfillment,
                method: c.method,
                time: {
                  type: c.timeType,
                  calculatedAt: c.calculatedAt,
                },
                fulfillmentMetadata: {
                  destinationLabel: c.destinationLabel,
                  destinationId: c.destinationId,
                },
              };
              const targetItemIds = fulfillmentAllocationItems.map(
                (i) => i.lineId,
              );
              const deltas: Delta[] = [
                {
                  action: DeltaActionType.DeclareAllocation,
                  allocation: newFulAlloc,
                },
              ];
              for (const lineId of targetItemIds) {
                const item = projectedState.items[lineId];
                if (item) {
                  const nonFulAllocs = item.allocations.filter(
                    (id) =>
                      projectedState.allocations[id]?.type !==
                      AllocationType.Fulfillment,
                  );
                  deltas.push({
                    action: DeltaActionType.ModifyItemAllocations,
                    lineId,
                    beforeAllocations: item.allocations,
                    afterAllocations: [...nonFulAllocs, newFulId],
                  });
                }
              }
              useVCSStore.getState().commitDeltas(deltas, "pos-ui");
              toast.success(
                `Fulfillment updated for ${fulfillmentAllocationItems.length} items`,
              );
              setSelectedLineIds(new Set());
            }
          } else {
            // global context
            if (selection.type === "config") {
              selectFulfillmentConfig(
                selection.configId!,
                mode as ConfigUpdateMode,
              );
              toast.success("Default fulfillment updated");
            } else if (selection.type === "custom" && selection.customConfig) {
              const c = selection.customConfig;
              const correlationId = `custom-fulfillment-${Date.now()}`;
              const newFulId = generateAllocationId("custom-fulfillment");
              const newFulAlloc: FulfillmentAllocation = {
                allocationId: newFulId,
                correlationId,
                type: AllocationType.Fulfillment,
                method: c.method,
                time: {
                  type: c.timeType,
                  calculatedAt: c.calculatedAt,
                },
                fulfillmentMetadata: {
                  destinationLabel: c.destinationLabel,
                  destinationId: c.destinationId,
                },
              };
              const deltas: Delta[] = [
                {
                  action: DeltaActionType.DeclareAllocation,
                  allocation: newFulAlloc,
                },
              ];
              useVCSStore.getState().commitDeltas(deltas, "pos-ui");
              selectFulfillmentConfig(correlationId, mode as ConfigUpdateMode);
              toast.success("Default fulfillment updated to custom settings");
            }
          }
        }}
      />

      <AddGuestDialog open={addGuestOpen} onOpenChange={setAddGuestOpen} />
      <GuestPickerDialog
        open={guestPickerOpen}
        onOpenChange={setGuestPickerOpen}
        selectedPerson={selectedPerson}
        onSelectPerson={setSelectedPerson}
        onEditGuest={(g: any) => {
          setGuestToEdit(g);
          setEditGuestOpen(true);
        }}
        onOpenAddGuest={handleOpenAddGuestDialog}
      />
      <EditGuestDialog
        open={editGuestOpen}
        onOpenChange={setEditGuestOpen}
        guestToEdit={guestToEdit}
      />

      <NoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        noteItem={noteItem}
        isComboChildItem={isComboChildItem}
        onSave={handleSaveNote}
      />

      <ModifierAddDialog
        open={modifierAddOpen}
        onOpenChange={setModifierAddOpen}
        itemName={
          modifierAddItem
            ? modifierAddItem.name
            : `${selectedLineIds.size} selected items`
        }
        modifiers={
          modifierAddItem ? singleItemCompatibleModifiers : compatibleModifiers
        }
        onAdd={(sku, defaultState) => {
          if (modifierAddItem)
            addModifier(modifierAddItem.lineId, sku, defaultState);
          else addGroupModifier(Array.from(selectedLineIds), sku, defaultState);
        }}
      />
      <NumberPadDialog
        open={qtyPadOpen}
        onOpenChange={setQtyPadOpen}
        title="Set Quantity"
        description="Enter the quantity to apply to all selected items."
        confirmLabel="Set Qty"
        initialValue={selectedItems.length === 1 ? selectedItems[0].qty : null}
        min={1}
        onConfirm={handleSetBulkQty}
      />
      <SplitQtyDialog
        open={splitQtyDialogOpen}
        onOpenChange={setSplitQtyDialogOpen}
        maxQty={maxSelectedQty}
        onConfirm={handleSplitQty}
      />
      <ChoiceDialog
        open={!!swapChoiceState}
        onOpenChange={(open) => {
          if (!open) setSwapChoiceState(null);
        }}
        title={`Swap ${slotName}`}
        description="Select an alternative option to swap for this slot."
        options={swapOptions}
        extraToggle={{
          label: "Retain compatible modifiers (e.g. extra cheese)",
          checked: retainModifiersDuringSwap,
          onCheckedChange: setRetainModifiersDuringSwap,
        }}
        onChoose={(option) => {
          if (swapChoiceState) {
            const [optionSku, modifierSku] = option.id.split(":");
            swapComboChoice(
              swapChoiceState.lineId,
              swapChoiceState.parentLineId,
              optionSku,
              modifierSku || undefined,
              retainModifiersDuringSwap,
            );
            setSwapChoiceState(null);
            toast.success("Combo choice updated");
          }
        }}
      />
      <ChoiceDialog
        open={dupMoveDialogOpen}
        onOpenChange={setDupMoveDialogOpen}
        title="Duplicate and Move"
        description="Choose a guest to duplicate the selected items to."
        searchPlaceholder="Search guests..."
        options={guestChoiceOptions}
        onChoose={(option) => {
          const newIds = duplicateAndReassignItems(Array.from(selectedLineIds), option.id);
          if (newIds && newIds.length > 0) {
            setSelectedLineIds(new Set(newIds));
          } else {
            setSelectedLineIds(new Set());
          }
          setDupMoveDialogOpen(false);
          toast.success(
            `Selected items duplicated and moved to ${option.label}`,
          );
        }}
      />

      <ChoiceDialog
        open={removeModDialogOpen}
        onOpenChange={setRemoveModDialogOpen}
        title="Remove Modifier"
        description="Choose a modifier to remove from all selected items."
        searchPlaceholder="Search modifiers..."
        options={removeModChoiceOptions}
        onChoose={(option) => {
          removeGroupModifier(Array.from(selectedLineIds), option.id);
          toast.success(`Removed modifier ${option.label} in bulk`);
        }}
      />

      <GroupNoteDialog
        open={groupNoteOpen}
        onOpenChange={setGroupNoteOpen}
        onSave={handleSaveGroupNote}
        selectedCount={groupNoteLineIds.length}
      />

      <BranchManagerDialog
        open={isBranchManagerOpen}
        onOpenChange={setIsBranchManagerOpen}
        branches={branches}
        activeBranch={activeBranch()}
        viewingHash={viewingHash}
        serverName={orderContext?.serverName || "default"}
        onCheckout={(branch) => {
          checkoutBranch(branch);
          toast.success(`Switched to "${branch}"`);
        }}
        onConfigure={(branch) => {
          setIsBranchManagerOpen(false);
          setBranchToConfig(branch);
          setIsBranchConfigOpen(true);
        }}
        onCreateBranch={handleCreateBranch}
        onOpenMerge={() => {
          setIsBranchManagerOpen(false);
          setIsMergeOpen(true);
        }}
      />
      <BranchConfigDialog
        open={isBranchConfigOpen}
        onOpenChange={setIsBranchConfigOpen}
        branchName={branchToConfig || ""}
        currentType={
          branchToConfig
            ? branches[branchToConfig]?.type || BranchType.Parallel
            : BranchType.Parallel
        }
        currentLabel={
          branchToConfig ? branches[branchToConfig]?.label || "" : ""
        }
        existingBranches={Object.keys(branches)}
        onSave={handleSaveBranchConfig}
      />
      <MergeBranchDialog
        open={isMergeOpen}
        onOpenChange={setIsMergeOpen}
        branches={branches}
        activeBranch={activeBranch()}
        resolveGuestName={resolveGuestName}
        isAlreadyMerged={(sourceBranch, targetBranch) => {
          const sourceHead = branches[sourceBranch]?.headHash;
          const targetHead = branches[targetBranch]?.headHash;
          if (!sourceHead || !targetHead) return false;
          return useVCSStore
            .getState()
            .engine.isAncestorOf(sourceHead, targetHead);
        }}
        onPreview={previewMerge}
        onCommit={(sourceBranches, targetBranch, resolutionDeltas) => {
          commitMerge(sourceBranches, targetBranch, resolutionDeltas);
          if (targetBranch === "main") {
            checkoutBranch("main");
            toast.success("Order confirmed on main and ready for checkout");
          }
        }}
      />
    </TooltipProvider>
  );
}
