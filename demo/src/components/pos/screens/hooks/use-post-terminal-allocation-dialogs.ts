import { useState, useCallback } from "react";
import { AllocationContext } from "@/lib/pos/types";
import { ProjectedLineItem } from "@/lib/vcs/types";

export function usePostTerminalAllocationDialogs() {
  const [allocConfigItem, setAllocConfigItem] = useState<ProjectedLineItem | null>(null);
  const [assignmentAllocationOpen, setAssignmentAllocationOpen] = useState(false);
  const [assignmentAllocationContext, setAssignmentAllocationContext] = useState<AllocationContext>(AllocationContext.Item);
  const [assignmentAllocationItems, setAssignmentAllocationItems] = useState<ProjectedLineItem[]>([]);
  const [paymentAllocationOpen, setPaymentAllocationOpen] = useState(false);
  const [paymentAllocationContext, setPaymentAllocationContext] = useState<AllocationContext>(AllocationContext.Item);
  const [paymentAllocationItems, setPaymentAllocationItems] = useState<ProjectedLineItem[]>([]);
  const [fulfillmentAllocationOpen, setFulfillmentAllocationOpen] = useState(false);
  const [fulfillmentAllocationContext, setFulfillmentAllocationContext] = useState<AllocationContext>(AllocationContext.Item);
  const [fulfillmentAllocationItems, setFulfillmentAllocationItems] = useState<ProjectedLineItem[]>([]);

  const handleAllocConfig = useCallback((item: ProjectedLineItem) => {
    setAllocConfigItem((prev) => (prev === item ? null : item));
  }, []);

  return {
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
  };
}