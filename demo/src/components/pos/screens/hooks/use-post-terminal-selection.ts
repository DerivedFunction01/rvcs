"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectedLineItem } from "@/lib/vcs/types";

export function usePostTerminalSelection(
  filteredRootItems: ProjectedLineItem[],
  visibleAssignees: Set<string>,
  visiblePayers: Set<string>,
  currentBranchName: string,
  viewingHash: string | null,
) {
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  const checklistRef = useRef<HTMLDivElement | null>(null);
  const bulkActionsBarRef = useRef<HTMLDivElement | null>(null);

  const handleSelectToggle = useCallback((lineId: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }, []);

  useEffect(() => {
    setSelectedLineIds((prev) => {
      const next = new Set<string>();
      for (const item of filteredRootItems) {
        if (prev.has(item.lineId)) next.add(item.lineId);
      }
      return next.size !== prev.size ? next : prev;
    });
  }, [filteredRootItems]);

  useEffect(() => {
    setSelectedLineIds(new Set());
  }, [visibleAssignees, visiblePayers]);

  useEffect(() => {
    setSelectedLineIds(new Set());
  }, [currentBranchName, viewingHash]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedLineIds.size === 0) return;
      const target = event.target as HTMLElement | null;
      if (!target || !document.body.contains(target)) return;

      if (
        checklistRef.current?.contains(target) ||
        bulkActionsBarRef.current?.contains(target)
      )
        return;

      if (
        target.closest("[data-radix-portal]") ||
        target.closest("[data-radix-popper-content-wrapper]") ||
        target.closest("[role=\"listbox\"]") ||
        target.closest("[role=\"combobox\"]") ||
        target.closest("[role=\"dialog\"]") ||
        target.closest("[role=\"menu\"]") ||
        target.closest(".bg-popover") ||
        target.closest(".radix-select-content") ||
        target.closest("#bulk-actions") ||
        target.closest("#bulk-actions-toggle") 
      )
        return;

      setSelectedLineIds(new Set());
    };

    document.addEventListener("click", handleClickOutside, true);
    return () => document.removeEventListener("click", handleClickOutside, true);
  }, [selectedLineIds]);

  return {
    selectedLineIds,
    setSelectedLineIds,
    handleSelectToggle,
    checklistRef,
    bulkActionsBarRef,
  };
}
