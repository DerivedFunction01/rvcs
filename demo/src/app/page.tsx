"use client";

import React, { useCallback } from "react";
import { useVCSStore } from "@/store/vcs-store";
import {
  formatFulfillmentTime,
  getPaymentAllocDisplayName,
} from "@/lib/pos/utils";
import { buildCommitGraph } from "@/lib/vcs/graph";
import { OrderInitScreen } from "@/components/pos/order-init-screen";
import { AllocationConfigDialog } from "@/components/pos/allocation-config-dialog";
import { PaymentAllocationDialog } from "@/components/pos/payment-allocation-dialog";
import { FulfillmentAllocationDialog } from "@/components/pos/fulfillment-allocation-dialog";
import { ModifierAddDialog } from "@/components/pos/modifier-add-dialog";
import { NumberPadDialog } from "@/components/pos/number-pad-dialog";
import {
  ChoiceDialog,
  type ChoiceDialogOption,
} from "@/components/pos/choice-dialog";
import { BranchConfigDialog } from "@/components/pos/branch-config-dialog";
import { BranchManagerDialog } from "@/components/pos/branch-manager-dialog";
import { MergeBranchDialog } from "@/components/pos/merge-dialog";

import { HistoryOpDialog } from "@/components/pos/history-op-dialog";
import { NoteDialog } from "@/components/pos/note-dialog";
import {
  AddGuestDialog,
  GuestPickerDialog,
  EditGuestDialog,
} from "@/components/pos/guest-dialogs";
import { CustomerEditDialog } from "@/components/pos/customer-edit-dialog";
import { CatalogPanel } from "@/components/pos/catalog-panel";
import { ActiveCheckPanel } from "@/components/pos/active-check-panel";
import { CommitLedgerPanel } from "@/components/pos/commit-ledger-panel";
import { GroupNotesPanel } from "@/components/pos/group-notes-panel";
import { GroupNoteDialog } from "@/components/pos/group-note-dialog";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type Guest,
  getGuestColor,
  getUniqueGuestLabel,
  getPatchedAllocations,
  getAssigneeFromItem,
} from "@/lib/pos/ui-utils";
import { OrderContextBanner } from "@/components/pos/order-context-banner";
import type { FloorConfig, OrderTypeConfig } from "@/lib/pos/types";
import { generateAllocationId } from "@/lib/vcs/id";
import type {
  ProjectedLineItem,
  Delta,
  AllocationBlock,
  PaymentAllocation,
  FulfillmentAllocation,
} from "@/lib/vcs/types";
import {
  GitCommitHorizontal,
  Clock,
  User,
  CreditCard,
  XCircle,
  Phone,
  MapPin,
  Settings2,
  ChevronDown,
  GitBranch,
  Lightbulb,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator as SeparatorUI } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";

// ─── POS Terminal (rendered after init) ────────────────────────────────────

function POSTerminalInner({
  floorConfigs,
  orderTypes,
}: {
  floorConfigs: FloorConfig[];
  orderTypes: OrderTypeConfig[];
}) {
  const {
    engine,
    projectedState,
    viewingHash,
    catalog,
    catalogLoaded,
    activeBranch,
    commitLog,
    headHash,
    addItemWithDefaults,
    addModifier,
    removeItem,
    mimicOrder,
    createBranch,
    checkoutBranch,
    viewRevision,
    setMainActiveBranch,
    mainActiveBranch,
    updateBranchConfig,
    renameBranch,
    orderContext,
    resetOrder,
    defaultPaymentMethod,
    defaultPaymentAllocId,
    defaultAssignmentAllocId,
    changeDefaultPayment,
    splitItemPayment,
    reassignItem,
    updateFulfillmentAllocation,
    resetItemPaymentToDefault,
    switchItemPayment,
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
    setItemsQty,
    reassignItems,
    groupItemsPaymentConfig,
    groupItemsFulfillmentConfig,
    addGroupModifier,
    removeGroupModifier,
    previewMerge,
    commitMerge,
    addGuestPaymentAllocation,
    squashPendingCommits,
    resetToCommit,
    addGroupNote,
    removeGroupNote,
    cleanupStaleNotes,
    attachNoteToOrder,
  } = useVCSStore();
  const iconConfigs = useVCSStore((state) => state.iconConfigs);

  // ─── Dynamic Guest List ─────────────────────────────────────────────
  const customerName = orderContext?.customerFields.name || "Guest";
  const initialGuests: Guest[] = React.useMemo(() => {
    const raw = orderContext?.customerFields.name || "Guest";
    const primaryAlias = raw.toLowerCase() === "guest" ? undefined : raw;
    const primary: Guest = {
      id: "__vcs_guest_1__",
      number: 1,
      alias: primaryAlias,
    };
    if (orderContext?.initialGuestNames?.length) {
      return orderContext.initialGuestNames.map((name, idx) => {
        const nextNum = idx + 1;
        const match = name.match(/^Guest\s+(\d+)(?:\s+\((.+)\))?$/i);
        if (match)
          return {
            id: `__vcs_guest_${match[1]}__`,
            number: parseInt(match[1], 10),
            alias: match[2] || undefined,
          };
        const gMatch = name.match(/^__vcs_guest_(\d+)__$/i);
        if (gMatch)
          return {
            id: name,
            number: parseInt(gMatch[1], 10),
            alias: undefined,
          };
        return { id: `__vcs_guest_${nextNum}__`, number: nextNum, alias: name };
      });
    }
    return [primary];
  }, [orderContext]);

  const [guests, setGuests] = React.useState<Guest[]>(initialGuests);

  const resolveGuestName = useCallback(
    (idOrName: string): string => {
      const g = guests.find((g) => g.id === idOrName);
      if (g) return g.alias || `Guest ${g.number}`;
      const match = idOrName.match(/^__vcs_guest_(\d+)__$/i);
      if (match) return `Guest ${match[1]}`;
      const legacyMatch = idOrName.match(/^Guest\s+(\d+)(?:\s+\((.+)\))?$/i);
      if (legacyMatch) return legacyMatch[2] || `Guest ${legacyMatch[1]}`;
      return idOrName;
    },
    [guests],
  );

  const getGuestStableId = useCallback(
    (displayNameOrId: string): string => {
      const g = guests.find(
        (g) =>
          g.id === displayNameOrId ||
          (g.alias && g.alias === displayNameOrId) ||
          `Guest ${g.number}` === displayNameOrId,
      );
      return g ? g.id : displayNameOrId;
    },
    [guests],
  );

  const guestStrings = React.useMemo(
    () => guests.map((g) => g.alias || `Guest ${g.number}`),
    [guests],
  );

  const resolvedAllocations = React.useMemo(() => {
    const resolved: Record<string, AllocationBlock> = {};
    for (const [id, alloc] of Object.entries(projectedState.allocations)) {
      if (alloc.type === "assignment")
        resolved[id] = { ...alloc, entity: resolveGuestName(alloc.entity) };
      else if (alloc.type === "payment")
        resolved[id] = { ...alloc, payer: resolveGuestName(alloc.payer) };
      else resolved[id] = alloc;
    }
    return resolved;
  }, [projectedState.allocations, resolveGuestName]);

  const [selectedLineIds, setSelectedLineIds] = React.useState<Set<string>>(
    new Set(),
  );
  const checklistRef = React.useRef<HTMLDivElement | null>(null);
  const bulkActionsBarRef = React.useRef<HTMLDivElement | null>(null);

  const handleSelectToggle = useCallback((lineId: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }, []);

  // Dropdown key states
  const [selectedPerson, setSelectedPerson] = React.useState(
    initialGuests[0].id,
  );
  const [addGuestOpen, setAddGuestOpen] = React.useState(false);
  const [editGuestOpen, setEditGuestOpen] = React.useState(false);
  const [guestToEdit, setGuestToEdit] = React.useState<Guest | null>(null);
  const [guestPickerOpen, setGuestPickerOpen] = React.useState(false);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [isLedgerCollapsed, setIsLedgerCollapsed] = React.useState(false);
  const [qtyPadOpen, setQtyPadOpen] = React.useState(false);
  const [dupMoveDialogOpen, setDupMoveDialogOpen] = React.useState(false);
  const [assignGuestDialogOpen, setAssignGuestDialogOpen] =
    React.useState(false);
  const [removeModDialogOpen, setRemoveModDialogOpen] = React.useState(false);
  const [groupNoteOpen, setGroupNoteOpen] = React.useState(false);
  const [groupNoteLineIds, setGroupNoteLineIds] = React.useState<string[]>([]);
  const [collapsedItems, setCollapsedItems] = React.useState<Set<string>>(
    new Set(),
  );
  const [detailLevel, setDetailLevel] = React.useState<
    "simple" | "balanced" | "full"
  >("balanced");
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

  // ─── Dialog State ───────────────────────────────
  const [historyOpDialog, setHistoryOpDialog] = React.useState<{
    type: "squash" | "reset";
    targetHash: string;
    label: string;
    description: string;
  } | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = React.useState(false);

  const handleConfirmHistoryOp = React.useCallback(() => {
    if (!historyOpDialog) return;
    try {
      if (historyOpDialog.type === "squash") {
        squashPendingCommits(historyOpDialog.targetHash);
        toast.success("Commits squashed successfully");
      } else if (historyOpDialog.type === "reset") {
        resetToCommit(historyOpDialog.targetHash);
        toast.success("Branch reset to selected commit");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setHistoryOpDialog(null);
    }
  }, [historyOpDialog, squashPendingCommits, resetToCommit]);

  const handleOpenCustomerDialog = React.useCallback(() => {
    setCustomerDialogOpen(true);
  }, []);

  const handleSaveCustomerFields = React.useCallback((fields: Record<string, string>) => {
    useVCSStore
      .getState()
      .updateOrderContext({ customerFields: fields });
    const newNameRaw = fields.name?.trim();
    if (newNameRaw) {
      const primaryAlias =
        newNameRaw.toLowerCase() === "guest" ? undefined : newNameRaw;
      setGuests((prev) => {
        const next = [...prev];
        if (next[0]) next[0] = { ...next[0], alias: primaryAlias };
        return next;
      });
    }
    toast.success("Customer info updated");
  }, [setGuests]);

  const [visibleGuests, setVisibleGuests] = React.useState<Set<string>>(
    new Set(initialGuests.map((g) => g.id)),
  );
  React.useEffect(() => {
    setVisibleGuests((prev) => {
      const next = new Set<string>();
      for (const g of guests) {
        if (prev.has(g.id)) next.add(g.id);
        else next.add(g.id);
      }
      return next;
    });
  }, [guests]);

  const [newBranchFromHistoryName, setNewBranchFromHistoryName] =
    React.useState("");
  const [isBranchManagerOpen, setIsBranchManagerOpen] = React.useState(false);
  const [isBranchConfigOpen, setIsBranchConfigOpen] = React.useState(false);
  const [branchToConfig, setBranchToConfig] = React.useState<string | null>(
    null,
  );
  const [isMergeOpen, setIsMergeOpen] = React.useState(false);

  const handleSaveBranchConfig = useCallback(
    (newName: string, type: "parallel" | "hypothetical", label: string) => {
      if (!branchToConfig) return;
      try {
        if (newName !== branchToConfig) {
          renameBranch(branchToConfig, newName);
          toast.success(`Branch "${branchToConfig}" renamed to "${newName}"`);
        }
        updateBranchConfig(newName, { type, label });
        toast.success(`Branch configuration saved`);
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [branchToConfig, renameBranch, updateBranchConfig],
  );

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

  const [allocConfigItem, setAllocConfigItem] =
    React.useState<ProjectedLineItem | null>(null);
  const [paymentAllocationOpen, setPaymentAllocationOpen] =
    React.useState(false);
  const [paymentAllocationContext, setPaymentAllocationContext] =
    React.useState<"item" | "group" | "header">("item");
  const [paymentAllocationItems, setPaymentAllocationItems] = React.useState<
    ProjectedLineItem[]
  >([]);
  const [fulfillmentAllocationOpen, setFulfillmentAllocationOpen] =
    React.useState(false);
  const [fulfillmentAllocationContext, setFulfillmentAllocationContext] =
    React.useState<"item" | "group" | "global">("item");
  const [fulfillmentAllocationItems, setFulfillmentAllocationItems] =
    React.useState<ProjectedLineItem[]>([]);
  const [modifierAddOpen, setModifierAddOpen] = React.useState(false);
  const [modifierAddItem, setModifierAddItem] =
    React.useState<ProjectedLineItem | null>(null);

  const handleOpenModifierDialog = React.useCallback(
    (item: ProjectedLineItem) => {
      setModifierAddItem(item);
      setModifierAddOpen(true);
    },
    [],
  );

  const [swapChoiceState, setSwapChoiceState] = React.useState<{
    lineId: string;
    parentLineId: string;
    slotSku: string;
  } | null>(null);
  const [retainModifiersDuringSwap, setRetainModifiersDuringSwap] =
    React.useState<boolean>(true);
  const handleOpenSwapDialog = React.useCallback(
    (lineId: string, parentLineId: string, slotSku: string) => {
      setSwapChoiceState({ lineId, parentLineId, slotSku });
    },
    [],
  );

  const [noteDialogOpen, setNoteDialogOpen] = React.useState(false);
  const [noteItem, setNoteItem] = React.useState<ProjectedLineItem | null>(
    null,
  );

  const isComboChildItem = React.useMemo(() => {
    if (!noteItem || !noteItem.parentLineId) return false;
    const parent = projectedState.items[noteItem.parentLineId];
    if (!parent) return false;
    const parentEntry = catalog[parent.sku];
    return !!parentEntry?.comboChoices;
  }, [noteItem, projectedState.items, catalog]);

  const handleOpenNoteDialog = React.useCallback((item: ProjectedLineItem) => {
    setNoteItem(item);
    setNoteDialogOpen(true);
  }, []);

  const handleSaveNote = React.useCallback(
    (text: string, linkToComboBase: boolean) => {
      if (!noteItem || !text.trim()) return;
      if (noteItem.sku === "custom_note") {
        useVCSStore
          .getState()
          .modifyModifierState(
            noteItem.lineId,
            noteItem.selectedModifierState,
            text.trim(),
          );
        toast.success("Note updated");
      } else {
        const parentId =
          linkToComboBase && noteItem.parentLineId
            ? noteItem.parentLineId
            : noteItem.lineId;
        useVCSStore
          .getState()
          .addModifier(parentId, "custom_note", text.trim());
        toast.success("Note added");
      }
      setNoteDialogOpen(false);
    },
    [noteItem],
  );

  // ─── Guest Management ──────────────────────────────────────────────────
  const addGuests = useCallback(
    (newGuests: Guest[]) => {
      const valid = newGuests.filter(
        (ng) =>
          !guests.some(
            (g) =>
              g.id === ng.id ||
              (ng.alias &&
                g.alias &&
                g.alias.toLowerCase() === ng.alias.toLowerCase()),
          ),
      );
      if (valid.length === 0) return;
      setGuests((prev) => [...prev, ...valid]);
      for (const g of valid) addGuestPaymentAllocation(g.id);
      if (valid.length === 1)
        toast.success(
          `${valid[0].alias || `Guest ${valid[0].number}`} added to the order`,
        );
      else toast.success(`${valid.length} guests added to the order`);
    },
    [guests, addGuestPaymentAllocation],
  );

  const handleSaveRenameGuest = useCallback(
    (newAlias: string, newDescription: string) => {
      if (!guestToEdit) return;
      const trimmedAlias = newAlias.trim();
      const trimmedDesc = newDescription.trim();
      if (guestToEdit.id === guests[0]?.id) {
        const currentFields =
          useVCSStore.getState().orderContext?.customerFields || {};
        useVCSStore.getState().updateOrderContext({
          customerFields: { ...currentFields, name: trimmedAlias || "Guest" },
        });
      }
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guestToEdit.id
            ? {
                ...g,
                alias: trimmedAlias || undefined,
                description: trimmedDesc || undefined,
              }
            : g,
        ),
      );
      toast.success(`Guest updated`);
      setEditGuestOpen(false);
      setGuestToEdit(null);
    },
    [guestToEdit, guests],
  );

  const handleAddGuestFromDialog = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const currentMax =
        guests.length > 0 ? Math.max(...guests.map((g) => g.number)) : 0;
      const nextNum = currentMax + 1;
      const newGuestId = `__vcs_guest_${nextNum}__`;
      const isGuestFormat = /^guest\s*\d*$/i.test(trimmed);
      const alias = isGuestFormat ? undefined : trimmed;
      if (
        guests.some(
          (g) => g.alias?.toLowerCase() === alias?.toLowerCase() && alias,
        )
      )
        return;
      addGuests([{ id: newGuestId, number: nextNum, alias }]);
    },
    [guests, addGuests],
  );

  const handleOpenAddGuestDialog = useCallback(() => {
    setAddGuestOpen(true);
  }, []);

  // ─── Derived State ──────────────────────────────────────────────────────
  const catalogItems = Object.values(catalog).filter(
    (i) => i.active && i.type === "item" && i.category !== "combo-slot",
  );
  const modifierItems = Object.values(catalog).filter(
    (i) => i.active && i.type === "modifier",
  );
  const groupedCatalog = catalogItems.reduce<
    Record<string, typeof catalogItems>
  >((acc, item) => {
    const cat = item.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});
  const availableTags = React.useMemo(() => {
    const tags = new Set<string>();
    for (const item of catalogItems) {
      for (const a of item.allergens) tags.add(a);
      for (const f of item.dietaryFlags) tags.add(f);
    }
    return Array.from(tags).sort();
  }, [catalogItems]);

  const rootItems = Object.values(projectedState.items).filter(
    (i) => !i.parentLineId,
  );
  const filteredRootItems = React.useMemo(() => {
    return rootItems.filter((item) => {
      if (hideCanceled && item.status === "canceled") return false;
      const assignee = getAssigneeFromItem(
        item,
        projectedState.allocations,
        guests,
      );
      return visibleGuests.has(assignee);
    });
  }, [
    rootItems,
    visibleGuests,
    projectedState.allocations,
    guests,
    hideCanceled,
  ]);

  const canceledCount = React.useMemo(() => {
    let count = 0;
    const countCanceled = (item: ProjectedLineItem) => {
      if (item.status === "canceled") count++;
      else item.children.forEach(countCanceled);
    };
    for (const item of rootItems) {
      if (
        visibleGuests.has(
          getAssigneeFromItem(item, projectedState.allocations, guests),
        )
      )
        countCanceled(item);
    }
    return count;
  }, [rootItems, projectedState.allocations, guests, visibleGuests]);

  React.useEffect(() => {
    setSelectedLineIds((prev) => {
      const next = new Set<string>();
      for (const item of filteredRootItems) {
        if (prev.has(item.lineId)) next.add(item.lineId);
      }
      return next.size !== prev.size ? next : prev;
    });
  }, [filteredRootItems]);
  React.useEffect(() => {
    setSelectedLineIds(new Set());
  }, [visibleGuests]);
  const currentBranchName = activeBranch();
  React.useEffect(() => {
    setSelectedLineIds(new Set());
  }, [currentBranchName, viewingHash]);
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedLineIds.size === 0) return;
      const target = e.target as HTMLElement;
      if (!target) return;
      if (
        checklistRef.current?.contains(target) ||
        bulkActionsBarRef.current?.contains(target)
      )
        return;
      if (
        target.closest("[data-radix-portal]") ||
        target.closest("[data-radix-popper-content-wrapper]") ||
        target.closest('[role="listbox"]') ||
        target.closest('[role="dialog"]') ||
        target.closest('[role="menu"]') ||
        target.closest(".bg-popover") ||
        target.closest(".radix-select-content")
      )
        return;
      setSelectedLineIds(new Set());
    };
    document.addEventListener("click", handleClickOutside, true);
    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [selectedLineIds]);

  const selectedItems = React.useMemo(
    () => rootItems.filter((item) => selectedLineIds.has(item.lineId)),
    [rootItems, selectedLineIds],
  );
  const compatibleModifiers = React.useMemo(() => {
    if (selectedItems.length === 0) return [];
    let commonSkus = catalog[selectedItems[0].sku]?.allowedModifiers || [];
    for (let i = 1; i < selectedItems.length; i++) {
      const allowed = catalog[selectedItems[i].sku]?.allowedModifiers || [];
      commonSkus = commonSkus.filter((sku) => allowed.includes(sku));
    }
    return modifierItems.filter((mod) => commonSkus.includes(mod.sku));
  }, [selectedItems, catalog, modifierItems]);
  const singleItemCompatibleModifiers = React.useMemo(() => {
    if (!modifierAddItem) return [];
    const allowed = catalog[modifierAddItem.sku]?.allowedModifiers || [];
    return modifierItems.filter((mod) => allowed.includes(mod.sku));
  }, [modifierAddItem, catalog, modifierItems]);
  const activeModifiersOnSelected = React.useMemo(() => {
    if (selectedItems.length === 0) return [];
    const activeModifierSkus = new Set<string>();
    for (const item of selectedItems) {
      for (const child of item.children) {
        if (catalog[child.sku]?.type === "modifier")
          activeModifierSkus.add(child.sku);
      }
    }
    return modifierItems.filter((mod) => activeModifierSkus.has(mod.sku));
  }, [selectedItems, catalog, modifierItems]);

  const paymentConfigs = React.useMemo(() => {
    const configs: Array<{ id: string; name: string; isSplit: boolean }> = [];
    const allocations = projectedState.allocations;
    const referencedIds = new Set<string>();
    for (const item of Object.values(projectedState.items)) {
      for (const id of item.allocations) referencedIds.add(id);
    }
    const singlePayers = new Map<string, PaymentAllocation>();
    const splitGroups = new Map<string, PaymentAllocation[]>();
    for (const alloc of Object.values(allocations)) {
      if (alloc.type === "payment") {
        const pay = alloc as PaymentAllocation;
        const isReferenced = referencedIds.has(alloc.allocationId);
        const isActive =
          activePaymentConfigId === alloc.allocationId ||
          activePaymentConfigId === alloc.correlationId;
        const isDefault = pay.correlationId?.startsWith("group-default-");
        if (!isReferenced && !isActive && !isDefault) continue;
        if (pay.correlationId) {
          if (pay.correlationId.startsWith("group-default-")) continue;
          const group = splitGroups.get(pay.correlationId) || [];
          group.push(pay);
          splitGroups.set(pay.correlationId, group);
        } else {
          if (pay.allocationId !== defaultPaymentAllocId)
            singlePayers.set(pay.allocationId, pay);
        }
      }
    }
    const patchedAllocs = getPatchedAllocations(allocations);
    singlePayers.forEach((pay, id) => {
      configs.push({
        id,
        name: `Single: ${getPaymentAllocDisplayName(patchedAllocs[id] as PaymentAllocation, patchedAllocs)}`,
        isSplit: false,
      });
    });
    splitGroups.forEach((group, correlationId) => {
      const isTrueSplit = group.length > 1;
      configs.push({
        id: correlationId,
        name: `${isTrueSplit ? "Split" : "Single"}: ${getPaymentAllocDisplayName(patchedAllocs[group[0].allocationId] as PaymentAllocation, patchedAllocs)}`,
        isSplit: isTrueSplit,
      });
    });
    return configs;
  }, [
    projectedState.allocations,
    projectedState.items,
    defaultPaymentAllocId,
    activePaymentConfigId,
  ]);

  const currentConfigName = React.useMemo(() => {
    if (
      activePaymentConfigId &&
      activePaymentConfigId.startsWith("group-default-")
    )
      return `${customerName} (${activePaymentConfigId.replace("group-default-", "").toUpperCase()})`;
    const allocations = projectedState.allocations;
    const activeAlloc = Object.values(allocations).find(
      (a) =>
        a.type === "payment" &&
        (a.allocationId === activePaymentConfigId ||
          a.correlationId === activePaymentConfigId),
    );
    if (activeAlloc) {
      const patchedAllocs = getPatchedAllocations(allocations);
      const siblings = activeAlloc.correlationId
        ? Object.values(patchedAllocs).filter(
            (a) =>
              a.type === "payment" &&
              a.correlationId === activeAlloc.correlationId &&
              a.allocationId !== activeAlloc.allocationId,
          )
        : [];
      return `${siblings.length > 0 ? "Split" : "Single"}: ${getPaymentAllocDisplayName(patchedAllocs[activeAlloc.allocationId] as PaymentAllocation, patchedAllocs)}`;
    }
    return "Default Config";
  }, [
    activePaymentConfigId,
    defaultPaymentAllocId,
    defaultPaymentMethod,
    projectedState.allocations,
    customerName,
  ]);

  const currentFulfillmentConfigName = React.useMemo(() => {
    const activeId = activeFulfillmentConfigId;
    if (!activeId) return "On Confirmation";
    const alloc = Object.values(projectedState.allocations).find(
      (a) =>
        a.type === "fulfillment" &&
        (a.allocationId === activeId || a.correlationId === activeId),
    ) as FulfillmentAllocation | undefined;
    if (alloc) {
      const methodLabel =
        alloc.method === "walk-in"
          ? "Walk In"
          : alloc.method === "pickup"
            ? "Pickup"
            : alloc.method === "delivery"
              ? "Delivery"
              : alloc.method;
      const destLabel = alloc.fulfillmentMetadata.destinationLabel
        ? ` (${alloc.fulfillmentMetadata.destinationLabel})`
        : "";
      if (alloc.time.type === "immediate" || !alloc.time.calculatedAt)
        return `${methodLabel}${destLabel} (Immediate)`;
      return `${methodLabel}${destLabel} @ ${formatFulfillmentTime(alloc.time.calculatedAt, orderContext?.initiatedAt)}`;
    }
    return "On Confirmation";
  }, [
    activeFulfillmentConfigId,
    projectedState.allocations,
    orderContext?.initiatedAt,
  ]);

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

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleAddItem = useCallback(
    (sku: string) => {
      addItemWithDefaults(sku, 1, selectedPerson);
      toast.success(`Added to ${resolveGuestName(selectedPerson)}'s order`);
    },
    [addItemWithDefaults, selectedPerson, resolveGuestName],
  );
  const handleReassign = useCallback(
    (lineId: string, newAssignee: string) => {
      reassignItem(lineId, getGuestStableId(newAssignee));
      toast.success(`Reassigned to ${newAssignee}`);
    },
    [reassignItem, getGuestStableId],
  );
  const handleUpdateFulfillment = useCallback(
    (
      lineId: string,
      timeType: "immediate" | "scheduled" | "deferred",
      calculatedAt: string | null,
    ) => {
      updateFulfillmentAllocation(lineId, timeType, calculatedAt);
      toast.success(
        timeType === "immediate"
          ? "Fulfillment scheduled: on confirmation"
          : `Fulfillment scheduled for ${formatFulfillmentTime(calculatedAt!, orderContext?.initiatedAt)}`,
      );
    },
    [updateFulfillmentAllocation, orderContext?.initiatedAt],
  );
  const handleSplitPayment = useCallback(
    (
      lineId: string,
      splits: Array<{
        entity: string;
        strategyType:
          | "percentage"
          | "fixed_item"
          | "fixed_global"
          | "remaining";
        value: number;
        method?: string | null;
      }>,
      mode: "group" | "item" = "group",
    ) => {
      splitItemPayment(
        lineId,
        splits.map((s) => ({ ...s, entity: getGuestStableId(s.entity) })),
        mode,
      );
      const splitName = [...splits]
        .sort((a, b) => b.value - a.value)
        .map(
          (s) =>
            `${s.entity} ${s.strategyType === "remaining" ? "rem" : s.strategyType === "percentage" ? `${Math.round(s.value * 100)}%` : `$${s.value}`}`,
        )
        .join(" / ");
      toast.success(`Payment split: ${splitName}`);
    },
    [splitItemPayment, getGuestStableId],
  );
  const handleResetToDefault = useCallback(
    (lineId: string) => {
      resetItemPaymentToDefault(lineId);
      toast.success(`Payment reset to ${defaultPaymentMethod}`);
    },
    [resetItemPaymentToDefault, defaultPaymentMethod],
  );
  const handleSetBulkQty = useCallback(
    (qty: number) => {
      if (selectedLineIds.size > 0) {
        setItemsQty(Array.from(selectedLineIds), qty);
        toast.success(`Set quantity to ${qty}`);
      }
    },
    [selectedLineIds, setItemsQty],
  );

  const handleOpenGroupNoteDialog = useCallback((lineIds: string[]) => {
    setGroupNoteLineIds(lineIds);
    setGroupNoteOpen(true);
  }, []);

  const handleSaveGroupNote = useCallback((text: string) => {
    addGroupNote(groupNoteLineIds, text);
    setSelectedLineIds(new Set());
  }, [addGroupNote, groupNoteLineIds]);

  const handleRemoveNoteFromItems = useCallback((lineIds: string[], noteId: string) => {
    removeGroupNote(lineIds, noteId);
  }, [removeGroupNote]);

  const handleCleanupStaleNotes = useCallback((noteIds: string[]) => {
    cleanupStaleNotes(noteIds);
  }, [cleanupStaleNotes]);

  const handleAttachNoteToOrder = useCallback((noteId: string, attached: boolean) => {
    attachNoteToOrder(noteId, attached);
  }, [attachNoteToOrder]);
  const guestChoiceOptions = React.useMemo(
    () =>
      guests.map((guest) => ({
        id: guest.id,
        label: guest.alias || `Guest ${guest.number}`,
        description:
          guest.description ||
          (guest.id === guests[0]?.id ? "Primary guest" : "Guest"),
      })),
    [guests],
  );
  const removeModChoiceOptions = React.useMemo(
    () =>
      activeModifiersOnSelected.map((mod) => ({
        id: mod.sku,
        label: mod.name,
        description: mod.sku,
      })),
    [activeModifiersOnSelected],
  );
  const selectedGuestCount = guests.length;
  const selectedGuestLabel = getUniqueGuestLabel(
    resolveGuestName(selectedPerson),
    guestStrings,
  );
  const selectedGuestDescription = React.useMemo(
    () => guests.find((g) => g.id === selectedPerson)?.description,
    [guests, selectedPerson],
  );
  const handleAllocConfig = useCallback((item: ProjectedLineItem) => {
    setAllocConfigItem((prev) => (prev === item ? null : item));
  }, []);
  const handleCreateBranch = useCallback(
    (name: string, startFromEmpty: boolean) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      try {
        let fromHash = viewingHash;
        if (startFromEmpty) {
          const fullLog = useVCSStore.getState().commitLog();
          fromHash =
            (
              fullLog.find((c) => c.authorId === "system-init") ||
              fullLog[fullLog.length - 1]
            )?.commitHash || null;
        }
        createBranch(trimmed, fromHash);
        toast.success(
          `Branch "${trimmed}" created${startFromEmpty ? " from empty root" : fromHash ? ` at commit ${fromHash.substring(0, 7)}` : ""}`,
        );
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [createBranch, viewingHash],
  );
  const handleResetOrder = useCallback(() => {
    resetOrder();
    setShowResetConfirm(false);
    setAddGuestOpen(false);
    toast.success("Order reset — ready for a new order");
  }, [resetOrder]);

  const swapOptions = React.useMemo<ChoiceDialogOption[]>(() => {
    if (!swapChoiceState) return [];
    const { parentLineId, slotSku } = swapChoiceState;
    const parentItem = projectedState.items[parentLineId];
    if (!parentItem) return [];
    const parentEntry = catalog[parentItem.sku];
    if (!parentEntry?.comboChoices) return [];
    const slotChoices = parentEntry.comboChoices.filter(
      (c) => c.slotSku === slotSku,
    );
    return slotChoices.map((choice) => {
      const name = catalog[choice.optionSku]?.name || choice.optionSku;
      const modifierName = choice.modifierSku
        ? catalog[choice.modifierSku]?.name
        : undefined;
      const currentItem = projectedState.items[swapChoiceState.lineId];
      const isCurrent =
        choice.optionSku === currentItem?.sku &&
        (choice.modifierSku
          ? currentItem.children?.some((c) => c.sku === choice.modifierSku)
          : !currentItem.children?.some((c) =>
              slotChoices.some(
                (sc) =>
                  sc.optionSku === choice.optionSku && sc.modifierSku === c.sku,
              ),
            ));
      return {
        id: `${choice.optionSku}:${choice.modifierSku || ""}`,
        label: modifierName ? `${name} (${modifierName})` : name,
        description: `$${choice.price.toFixed(2)}`,
        badge: isCurrent ? (
          <Badge className="bg-primary/20 text-primary border-transparent text-[9px] h-3.5 px-1 inline-flex">
            Current
          </Badge>
        ) : undefined,
      };
    });
  }, [swapChoiceState, projectedState.items, catalog]);
  const slotName = swapChoiceState
    ? catalog[swapChoiceState.slotSku]?.name || "Slot Choice"
    : "Slot Choice";

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
                setPaymentAllocationContext("header");
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
                setFulfillmentAllocationContext("global");
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
          />
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
            visibleGuests={visibleGuests}
            setVisibleGuests={setVisibleGuests}
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
            duplicateItems={duplicateItems}
            setDupMoveDialogOpen={setDupMoveDialogOpen}
            removeItems={removeItems}
            setAssignGuestDialogOpen={setAssignGuestDialogOpen}
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
        guests={guestStrings}
        defaultPaymentAllocId={defaultPaymentAllocId}
        defaultPaymentMethod={defaultPaymentMethod}
        onReassign={handleReassign}
        onResetToDefault={handleResetToDefault}
        onAddGuest={handleAddGuestFromDialog}
        onTriggerPaymentAllocation={(item) => {
          setPaymentAllocationItems([item]);
          setPaymentAllocationContext("item");
          setPaymentAllocationOpen(true);
        }}
        onTriggerFulfillmentAllocation={(item) => {
          setFulfillmentAllocationItems([item]);
          setFulfillmentAllocationContext("item");
          setFulfillmentAllocationOpen(true);
        }}
        initiatedAt={orderContext?.initiatedAt}
      />

      <PaymentAllocationDialog
        open={paymentAllocationOpen}
        onOpenChange={setPaymentAllocationOpen}
        context={paymentAllocationContext}
        items={paymentAllocationItems}
        allocations={resolvedAllocations}
        guests={guestStrings}
        defaultPaymentAllocId={defaultPaymentAllocId}
        defaultPaymentMethod={defaultPaymentMethod}
        paymentConfigs={paymentConfigs}
        activePaymentConfigId={activePaymentConfigId}
        selectedGuestName={resolveGuestName(selectedPerson)}
        allItems={Object.values(projectedState.items)}
        onApplyConfig={(configIdOrMethod, mode) => {
          if (paymentAllocationContext === "item") {
            groupItemsPaymentConfig(
              [paymentAllocationItems[0].lineId],
              configIdOrMethod,
            );
            toast.success("Payment config updated for item");
          } else if (paymentAllocationContext === "group") {
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
                mode as "change-existing" | "new-only",
              );
            } else {
              selectPaymentConfig(
                configIdOrMethod,
                mode as "change-existing" | "new-only",
              );
            }
            let targetName = configIdOrMethod.startsWith("group-default-")
              ? `${customerName} (${configIdOrMethod.replace("group-default-", "").toUpperCase()})`
              : paymentConfigs.find((c) => c.id === configIdOrMethod)?.name;
            if (!targetName) {
              const representativeAlloc = Object.values(
                projectedState.allocations,
              ).find(
                (a) =>
                  a.type === "payment" &&
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
            if (mode === "change-existing") {
              toast.success(`All items switched to ${targetName}`);
            } else {
              toast.success(`Default set to ${targetName} for new items`);
            }
          }
        }}
        onApplyCustomSplit={(splits, mode) => {
          if (paymentAllocationContext === "item") {
            handleSplitPayment(
              paymentAllocationItems[0].lineId,
              splits,
              mode as "group" | "item",
            );
          } else if (paymentAllocationContext === "group") {
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
            selectPaymentConfig(corrId, mode as "change-existing" | "new-only");
            if (mode === "change-existing")
              toast.success("Custom split applied to all existing items");
            else toast.success("Custom split set as default for new items");
          }
        }}
        onAddGuest={handleAddGuestFromDialog}
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
          if (fulfillmentAllocationContext === "item") {
            if (selection.type === "config") {
              const matchedAllocs = Object.values(
                projectedState.allocations,
              ).filter(
                (a): a is FulfillmentAllocation =>
                  a.type === "fulfillment" &&
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
                      projectedState.allocations[id]?.type !== "fulfillment",
                  );
                  useVCSStore.getState().commitDeltas(
                    [
                      {
                        action: "modify_item_allocations",
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
          } else if (fulfillmentAllocationContext === "group") {
            if (selection.type === "config") {
              const matchedAllocs = Object.values(
                projectedState.allocations,
              ).filter(
                (a): a is FulfillmentAllocation =>
                  a.type === "fulfillment" &&
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
                        projectedState.allocations[id]?.type !== "fulfillment",
                    );
                    deltas.push({
                      action: "modify_item_allocations",
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
              const newFulId = generateAllocationId("fulfillment");
              const newFulAlloc: FulfillmentAllocation = {
                allocationId: newFulId,
                type: "fulfillment",
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
                { action: "declare_allocation", allocation: newFulAlloc },
              ];
              for (const lineId of targetItemIds) {
                const item = projectedState.items[lineId];
                if (item) {
                  const nonFulAllocs = item.allocations.filter(
                    (id) =>
                      projectedState.allocations[id]?.type !== "fulfillment",
                  );
                  deltas.push({
                    action: "modify_item_allocations",
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
                mode as "change-existing" | "new-only",
              );
              toast.success("Default fulfillment updated");
            } else if (selection.type === "custom" && selection.customConfig) {
              const c = selection.customConfig;
              const correlationId = `custom-fulfillment-${Date.now()}`;
              const newFulId = generateAllocationId("custom-fulfillment");
              const newFulAlloc: FulfillmentAllocation = {
                allocationId: newFulId,
                correlationId,
                type: "fulfillment",
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
                { action: "declare_allocation", allocation: newFulAlloc },
              ];
              useVCSStore.getState().commitDeltas(deltas, "pos-ui");
              selectFulfillmentConfig(
                correlationId,
                mode as "change-existing" | "new-only",
              );
              toast.success("Default fulfillment updated to custom settings");
            }
          }
        }}
      />

      <AddGuestDialog
        open={addGuestOpen}
        onOpenChange={setAddGuestOpen}
        guests={guests}
        onAddGuests={addGuests}
      />
      <GuestPickerDialog
        open={guestPickerOpen}
        onOpenChange={setGuestPickerOpen}
        guests={guests}
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
        onSave={handleSaveRenameGuest}
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
        initialValue={null}
        min={1}
        onConfirm={handleSetBulkQty}
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
          duplicateAndReassignItems(Array.from(selectedLineIds), option.id);
          setSelectedLineIds(new Set());
          setDupMoveDialogOpen(false);
          toast.success(
            `Selected items duplicated and moved to ${option.label}`,
          );
        }}
      />
      <ChoiceDialog
        open={assignGuestDialogOpen}
        onOpenChange={setAssignGuestDialogOpen}
        title="Assign Guest"
        description="Choose a guest for the selected items."
        searchPlaceholder="Search guests..."
        options={guestChoiceOptions}
        onChoose={(option) => {
          reassignItems(Array.from(selectedLineIds), option.id);
          setAssignGuestDialogOpen(false);
          toast.success(`Selected items assigned to ${option.label}`);
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
            ? branches[branchToConfig]?.type || "parallel"
            : "parallel"
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

// ─── Main Page (gates Init Screen vs POS Terminal) ─────────────────────────

export default function POSTerminal() {
  const { isInitialized, initRepo, loadCatalog, catalogLoaded, hydrate } =
    useVCSStore();
  const [storeLabel, setStoreLabel] = React.useState("Main Location");
  const [defaultPaymentFromConfig, setDefaultPaymentFromConfig] =
    React.useState("cash");
  const [orderTypes, setOrderTypes] = React.useState<OrderTypeConfig[]>([]);
  const [floorConfigs, setFloorConfigs] = React.useState<FloorConfig[]>([]);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (!catalogLoaded) {
      fetch("/api/catalog")
        .then((r) => r.json())
        .then((data) => {
          if (data.catalog) loadCatalog(data.catalog);
        })
        .catch(console.error);
    }
  }, [catalogLoaded, loadCatalog]);

  React.useEffect(() => {
    fetch("/api/pos-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.label) setStoreLabel(data.label);
        if (data.defaultPaymentMethod)
          setDefaultPaymentFromConfig(data.defaultPaymentMethod);
        if (data.orderTypes) setOrderTypes(data.orderTypes);
        if (data.floorConfigs) setFloorConfigs(data.floorConfigs);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    fetch("/api/icon-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.configs) useVCSStore.getState().loadIconConfigs(data.configs);
      })
      .catch(() => {});
  }, []);

  const handleOrderStart = useCallback(
    (context: Parameters<typeof initRepo>[0]) => {
      initRepo(context, defaultPaymentFromConfig);
      toast.success(
        `${context.orderTypeLabel} order started for ${context.customerFields.name || "customer"} on ${context.serverName}`,
      );
    },
    [initRepo, defaultPaymentFromConfig],
  );

  if (!isInitialized)
    return (
      <OrderInitScreen
        onOrderStart={handleOrderStart}
        storeLabel={storeLabel}
      />
    );

  const currentBranchName = useVCSStore.getState().activeBranch();
  const viewingHash = useVCSStore.getState().viewingHash;
  return (
    <POSTerminalInner
      key={`${currentBranchName}-${viewingHash || "head"}`}
      floorConfigs={floorConfigs}
      orderTypes={orderTypes}
    />
  );
}
