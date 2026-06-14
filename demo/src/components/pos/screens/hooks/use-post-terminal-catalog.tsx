import { useMemo } from "react";
import { CatalogCategory, CatalogItemType } from "@/lib/vcs/types";
import type { CatalogItemEntry, ProjectedLineItem } from "@/lib/vcs/types";
import { Badge } from "@/components/ui/badge";
import type { ChoiceDialogOption } from "@/components/pos/dialogs/choice-dialog";

export function usePostTerminalCatalog(
  catalog: Record<string, CatalogItemEntry>,
  selectedItems: ProjectedLineItem[],
  modifierAddItem: ProjectedLineItem | null,
  swapChoiceState: { lineId: string; parentLineId: string; slotSku: string } | null,
  projectedItems: Record<string, ProjectedLineItem>
) {
  const catalogItems = useMemo(() =>
    Object.values(catalog).filter(
      (i) =>
        i.active &&
        i.type === CatalogItemType.Item &&
        i.category !== CatalogCategory.ComboSlot,
    ),
  [catalog]);

  const modifierItems = useMemo(() =>
    Object.values(catalog).filter(
      (i) => i.active && i.type === CatalogItemType.Modifier,
    ),
  [catalog]);

  const groupedCatalog = useMemo(() =>
    catalogItems.reduce<Record<string, typeof catalogItems>>((acc, item) => {
      const cat = item.category || CatalogCategory.General;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {}),
  [catalogItems]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const item of catalogItems) {
      for (const a of item.allergens) tags.add(a);
      for (const f of item.dietaryFlags) tags.add(f);
    }
    return Array.from(tags).sort();
  }, [catalogItems]);

  const compatibleModifiers = useMemo(() => {
    if (selectedItems.length === 0) return [];
    let commonSkus = catalog[selectedItems[0].sku]?.allowedModifiers || [];
    for (let i = 1; i < selectedItems.length; i++) {
      const allowed = catalog[selectedItems[i].sku]?.allowedModifiers || [];
      commonSkus = commonSkus.filter((sku) => allowed.includes(sku));
    }
    return modifierItems.filter((mod) => commonSkus.includes(mod.sku));
  }, [selectedItems, catalog, modifierItems]);

  const singleItemCompatibleModifiers = useMemo(() => {
    if (!modifierAddItem) return [];
    const allowed = catalog[modifierAddItem.sku]?.allowedModifiers || [];
    return modifierItems.filter((mod) => allowed.includes(mod.sku));
  }, [modifierAddItem, catalog, modifierItems]);

  const activeModifiersOnSelected = useMemo(() => {
    if (selectedItems.length === 0) return [];
    const activeModifierSkus = new Set<string>();
    for (const item of selectedItems) {
      for (const child of item.children) {
        if (catalog[child.sku]?.type === CatalogItemType.Modifier)
          activeModifierSkus.add(child.sku);
      }
    }
    return modifierItems.filter((mod) => activeModifierSkus.has(mod.sku));
  }, [selectedItems, catalog, modifierItems]);

  const removeModChoiceOptions = useMemo(
    () =>
      activeModifiersOnSelected.map((mod) => ({
        id: mod.sku,
        label: mod.name,
        description: mod.sku,
      })),
    [activeModifiersOnSelected],
  );

  const swapOptions = useMemo<ChoiceDialogOption[]>(() => {
    if (!swapChoiceState) return [];
    const { parentLineId, slotSku } = swapChoiceState;
    const parentItem = projectedItems[parentLineId];
    if (!parentItem) return [];
    const parentEntry = catalog[parentItem.sku];
    if (!parentEntry?.comboChoices) return [];
    const slotChoices = parentEntry.comboChoices.filter(
      (c) => c.slotSku === slotSku,
    );
    return slotChoices.map((choice) => {
      const name = catalog[choice.optionSku]?.name || choice.optionSku;
      const modifierName = choice.modifierSku ? catalog[choice.modifierSku]?.name : undefined;
      const currentItem = projectedItems[swapChoiceState.lineId];
      const isCurrent = choice.optionSku === currentItem?.sku && (choice.modifierSku ? currentItem.children?.some((c) => c.sku === choice.modifierSku) : !currentItem.children?.some((c) => slotChoices.some((sc) => sc.optionSku === choice.optionSku && sc.modifierSku === c.sku)));
      return {
        id: `${choice.optionSku}:${choice.modifierSku || ""}`,
        label: modifierName ? `${name} (${modifierName})` : name,
        description: `$${choice.price.toFixed(2)}`,
        badge: isCurrent ? <Badge className="bg-primary/20 text-primary border-transparent text-[9px] h-3.5 px-1 inline-flex">Current</Badge> : undefined,
      };
    });
  }, [swapChoiceState, projectedItems, catalog]);

  const slotName = swapChoiceState ? catalog[swapChoiceState.slotSku]?.name || "Slot Choice" : "Slot Choice";

  return { catalogItems, modifierItems, groupedCatalog, availableTags, compatibleModifiers, singleItemCompatibleModifiers, activeModifiersOnSelected, removeModChoiceOptions, swapOptions, slotName };
}