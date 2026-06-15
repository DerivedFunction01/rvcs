import React from "react";
import { toast } from "sonner";
import { AllocationConfigDialog } from "@/components/pos/dialogs/allocation-config-dialog";
import { AssignmentAllocationDialog } from "@/components/pos/dialogs/assignment-allocation-dialog";
import { PaymentAllocationDialog } from "@/components/pos/dialogs/payment-allocation-dialog";
import { FulfillmentAllocationDialog } from "@/components/pos/dialogs/fulfillment-allocation-dialog";
import { useVCSStore } from "@/store/vcs-store";
import { AllocationContext, ConfigType, ConfigUpdateMode, PaymentUpdateMode, type FloorConfig, type OrderContext } from "@/lib/pos/types";
import { AllocationType, DeltaActionType, type Delta, type FulfillmentAllocation, type PaymentAllocation, type ProjectedState } from "@/lib/vcs/types";
import { generateAllocationId } from "@/lib/vcs/id";
import type { usePostTerminalAllocationDialogs } from "@/components/pos/screens/hooks/use-post-terminal-allocation-dialogs";
import type { usePostTerminalActions } from "@/components/pos/screens/hooks/use-post-terminal-actions";
import type { usePostTerminalConfigs } from "@/components/pos/screens/hooks/use-post-terminal-configs";

export function PosAllocationDialogs({
  dialogs,
  actions,
  configs,
  projectedState,
  orderContext,
  guests,
  resolveGuestName,
  selectedPerson,
  floorConfigs,
  setSelectedLineIds,
  defaultPaymentMethod,
  defaultPaymentAllocId,
  activePaymentConfigId,
  activeFulfillmentConfigId,
}: {
  dialogs: ReturnType<typeof usePostTerminalAllocationDialogs>;
  actions: ReturnType<typeof usePostTerminalActions>;
  configs: ReturnType<typeof usePostTerminalConfigs>;
  projectedState: ProjectedState;
  orderContext: OrderContext | null;
  guests: any[];
  resolveGuestName: (id: string) => string;
  selectedPerson: string;
  floorConfigs: FloorConfig[];
  setSelectedLineIds: (ids: Set<string>) => void;
  defaultPaymentMethod: string;
  defaultPaymentAllocId: string | null;
  activePaymentConfigId: string | null;
  activeFulfillmentConfigId: string | null;
}) {
  const store = useVCSStore();

  const liveAllocConfigItem = dialogs.allocConfigItem
    ? projectedState.items[dialogs.allocConfigItem.lineId] || dialogs.allocConfigItem
    : null;

  return (
    <>
      <AllocationConfigDialog
        open={!!dialogs.allocConfigItem}
        onOpenChange={(open) => {
          if (!open) dialogs.setAllocConfigItem(null);
        }}
        item={liveAllocConfigItem}
        allocations={configs.resolvedAllocations}
        defaultPaymentAllocId={defaultPaymentAllocId}
        defaultPaymentMethod={defaultPaymentMethod}
        onResetToDefault={actions.handleResetToDefault}
        onTriggerAssignmentAllocation={(item) => {
          dialogs.setAssignmentAllocationItems([item]);
          dialogs.setAssignmentAllocationContext(AllocationContext.Item);
          dialogs.setAssignmentAllocationOpen(true);
        }}
        onTriggerPaymentAllocation={(item) => {
          dialogs.setPaymentAllocationItems([item]);
          dialogs.setPaymentAllocationContext(AllocationContext.Item);
          dialogs.setPaymentAllocationOpen(true);
        }}
        onTriggerFulfillmentAllocation={(item) => {
          dialogs.setFulfillmentAllocationItems([item]);
          dialogs.setFulfillmentAllocationContext(AllocationContext.Item);
          dialogs.setFulfillmentAllocationOpen(true);
        }}
        initiatedAt={orderContext?.initiatedAt}
      />

      <AssignmentAllocationDialog
        open={dialogs.assignmentAllocationOpen}
        onOpenChange={dialogs.setAssignmentAllocationOpen}
        context={dialogs.assignmentAllocationContext}
        items={dialogs.assignmentAllocationItems}
        allocations={projectedState.allocations}
        guests={guests}
        onApplyConfig={(guestIds) => {
          if (dialogs.assignmentAllocationContext === AllocationContext.Item) {
            actions.handleReassign(dialogs.assignmentAllocationItems[0].lineId, guestIds);
          } else {
            store.reassignItems(
              dialogs.assignmentAllocationItems.map((i) => i.lineId),
              guestIds,
            );
            const displayNames = guestIds
              .split(",")
              .map((id) => resolveGuestName(id))
              .join(" + ");
            toast.success(
              `Assigned selected ${dialogs.assignmentAllocationItems.length} items to ${displayNames}`,
            );
            setSelectedLineIds(new Set());
          }
        }}
        onAddGuest={actions.handleAddGuestFromDialog}
      />

      <PaymentAllocationDialog
        open={dialogs.paymentAllocationOpen}
        onOpenChange={dialogs.setPaymentAllocationOpen}
        context={dialogs.paymentAllocationContext}
        items={dialogs.paymentAllocationItems}
        allocations={configs.resolvedAllocations}
        defaultPaymentAllocId={defaultPaymentAllocId}
        defaultPaymentMethod={defaultPaymentMethod}
        paymentConfigs={configs.paymentConfigs}
        activePaymentConfigId={activePaymentConfigId}
        selectedGuestName={resolveGuestName(selectedPerson)}
        allItems={Object.values(projectedState.items)}
        onApplyConfig={(configIdOrMethod, mode) => {
          if (dialogs.paymentAllocationContext === AllocationContext.Item) {
            store.groupItemsPaymentConfig(
              [dialogs.paymentAllocationItems[0].lineId],
              configIdOrMethod,
            );
            toast.success("Payment config updated for item");
          } else if (dialogs.paymentAllocationContext === AllocationContext.Group) {
            store.groupItemsPaymentConfig(
              dialogs.paymentAllocationItems.map((i) => i.lineId),
              configIdOrMethod,
            );
            toast.success(
              `Payment config updated for ${dialogs.paymentAllocationItems.length} selected items`,
            );
            setSelectedLineIds(new Set());
          } else {
            if (configIdOrMethod.startsWith("group-default-")) {
              store.changeDefaultPayment(
                configIdOrMethod.replace("group-default-", ""),
                mode as ConfigUpdateMode,
              );
            } else {
              store.selectPaymentConfig(configIdOrMethod, mode as ConfigUpdateMode);
            }
            let targetName = configIdOrMethod.startsWith("group-default-")
              ? `(${configIdOrMethod.replace("group-default-", "").toUpperCase()})`
              : configs.paymentConfigs.find((c) => c.id === configIdOrMethod)?.name;
            if (!targetName) {
              const representativeAlloc = Object.values(
                projectedState.allocations,
              ).find(
                (a) =>
                  a.type === AllocationType.Payment &&
                  ((a as PaymentAllocation).allocationId === configIdOrMethod ||
                    (a as PaymentAllocation).correlationId === configIdOrMethod),
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
          if (dialogs.paymentAllocationContext === AllocationContext.Item) {
            actions.handleSplitPayment(
              dialogs.paymentAllocationItems[0].lineId,
              splits,
              mode as PaymentUpdateMode,
            );
          } else if (dialogs.paymentAllocationContext === AllocationContext.Group) {
            const corrId = store.createTableSplitConfig(splits);
            store.groupItemsPaymentConfig(
              dialogs.paymentAllocationItems.map((i) => i.lineId),
              corrId,
            );
            toast.success(
              `Custom split applied to ${dialogs.paymentAllocationItems.length} selected items`,
            );
            setSelectedLineIds(new Set());
          } else {
            const corrId = store.createTableSplitConfig(splits);
            store.selectPaymentConfig(corrId, mode as ConfigUpdateMode);
            if (mode === ConfigUpdateMode.ChangeExisting)
              toast.success("Custom split applied to all existing items");
            else toast.success("Custom split set as default for new items");
          }
        }}
      />

      <FulfillmentAllocationDialog
        open={dialogs.fulfillmentAllocationOpen}
        onOpenChange={dialogs.setFulfillmentAllocationOpen}
        context={dialogs.fulfillmentAllocationContext}
        items={dialogs.fulfillmentAllocationItems}
        allocations={projectedState.allocations}
        activeFulfillmentConfigId={activeFulfillmentConfigId}
        allItems={Object.values(projectedState.items)}
        floorConfigs={floorConfigs}
        guests={guests}
        onApplyFulfillmentConfig={(selection, mode) => {
          if (dialogs.fulfillmentAllocationContext === AllocationContext.Item) {
            if (selection.type === ConfigType.Config) {
              // logic preserved via store interaction
              store.groupItemsFulfillmentConfig(
                [dialogs.fulfillmentAllocationItems[0].lineId],
                selection.configId!
              );
              toast.success("Fulfillment configuration updated for item");
            } else if (selection.type === ConfigType.Custom && selection.customConfig) {
              const c = selection.customConfig;
              actions.handleUpdateFulfillment(
                dialogs.fulfillmentAllocationItems[0].lineId,
                c.timeType,
                c.calculatedAt
              );
            }
          } else if (dialogs.fulfillmentAllocationContext === AllocationContext.Group) {
            if (selection.type === ConfigType.Config) {
              store.groupItemsFulfillmentConfig(
                dialogs.fulfillmentAllocationItems.map(i => i.lineId),
                selection.configId!
              );
              toast.success(`Fulfillment updated for ${dialogs.fulfillmentAllocationItems.length} items`);
              setSelectedLineIds(new Set());
            }
          } else {
            // global context
            if (selection.type === ConfigType.Config) {
              store.selectFulfillmentConfig(selection.configId!, mode as ConfigUpdateMode);
              toast.success("Default fulfillment updated");
            }
          }
        }}
      />
    </>
  );
}