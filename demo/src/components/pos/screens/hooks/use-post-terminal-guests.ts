"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVCSStore } from "@/store/vcs-store";
import { getUniqueGuestLabel, type Guest } from "@/lib/pos/ui-utils";
import { type AllocationBlock } from "@/lib/vcs/types";

export function usePostTerminalGuests(
  allocations: Record<string, AllocationBlock>,
  defaultAssignmentAllocId: string | null | undefined,
) {
  const getGuests = useVCSStore((state) => state.guests);
  const storeGuests = useMemo(() => getGuests(), [getGuests, allocations]);

  const guests: Guest[] = useMemo(
    () =>
      storeGuests.map((g, idx) => ({
        id: g.id,
        number: idx + 1,
        alias: g.name,
      })),
    [storeGuests],
  );

  const resolveGuestName = useCallback(
    (idOrName: string): string => {
      if (idOrName.includes(",")) {
        return idOrName
          .split(",")
          .map((item) => item.trim())
          .map((id) => {
            const guest = storeGuests.find((g) => g.id === id);
            return guest ? guest.name : id;
          })
          .join(" + ");
      }
      const guest = storeGuests.find((g) => g.id === idOrName);
      return guest ? guest.name : idOrName;
    },
    [storeGuests],
  );

  const guestStrings = useMemo(
    () => storeGuests.map((g) => g.name),
    [storeGuests],
  );

  const [selectedPerson, setSelectedPerson] = useState("");
  useEffect(() => {
    if (!selectedPerson && storeGuests.length > 0) {
      setSelectedPerson(defaultAssignmentAllocId || storeGuests[0].id);
    }
  }, [storeGuests, selectedPerson, defaultAssignmentAllocId]);

  const [visibleAssignees, setVisibleAssignees] = useState<Set<string>>(
    () => new Set(storeGuests.map((g) => g.id)),
  );
  const [visiblePayers, setVisiblePayers] = useState<Set<string>>(
    () => new Set(storeGuests.map((g) => g.id)),
  );
  const prevGuestIds = useRef<Set<string>>(new Set(storeGuests.map((g) => g.id)));

  useEffect(() => {
    const currentIds = new Set(storeGuests.map((g) => g.id));

    setVisibleAssignees((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of currentIds) {
        if (!prevGuestIds.current.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      for (const id of prev) {
        if (!currentIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setVisiblePayers((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of currentIds) {
        if (!prevGuestIds.current.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      for (const id of prev) {
        if (!currentIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    prevGuestIds.current = currentIds;
  }, [storeGuests]);

  const guestChoiceOptions = useMemo(
    () =>
      storeGuests.map((guest) => ({
        id: guest.id,
        label: guest.name,
        description:
          guest.id === storeGuests[0]?.id ? "Primary guest" : "Guest",
      })),
    [storeGuests],
  );

  const selectedGuestCount = storeGuests.length;
  const selectedGuestLabel = useMemo(
    () => getUniqueGuestLabel(resolveGuestName(selectedPerson), guestStrings),
    [resolveGuestName, selectedPerson, guestStrings],
  );
  const [guestFilterOp, setGuestFilterOp] = useState<"AND" | "OR">("OR");

  const selectedGuestDescription = useMemo(
    () => (selectedPerson === storeGuests[0]?.id ? "Primary guest" : "Guest"),
    [storeGuests, selectedPerson],
  );

  return {
    storeGuests,
    guests,
    resolveGuestName,
    guestStrings,
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
  };
}
