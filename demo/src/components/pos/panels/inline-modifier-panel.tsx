import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { NumberFractionOverflow, useFormatNumber } from "@/components/pos/hooks/use-format-number";
import type { CatalogItemEntry, ProjectedLineItem, SizeGroup } from "@/lib/vcs/types";
import { ItemStatus } from "@/lib/vcs/types";
import { Settings2, Minus, Plus, Scale, Scaling, Trash2 } from "lucide-react";
import { useVCSStore } from "@/store/vcs-store";
import { Dispatch, SetStateAction, useState } from "react";

export interface InlineModifierPanelProps {
    selectedItems: ProjectedLineItem[];
    catalog: Record<string, CatalogItemEntry>;
    compatibleModifiers: CatalogItemEntry[];
    onAddModifier: (sku: string, state?: string) => void;
    onRemoveModifier: (lineId: string) => void;
    onUpdateModifierState: (sku: string, state: string) => void;
    onUpdateInlineQty: (sku: string, change: number) => void;
}

export function InlineModifierPanel({
    selectedItems,
    catalog,
    onRemoveModifier,
    onUpdateModifierState,
    onUpdateInlineQty,
}: InlineModifierPanelProps) {
    const formatNumber = useFormatNumber();
    const projectedState = useVCSStore((state) => state.projectedState);
    const [showDeltaPrice, setShowDeltaPrice] = useState(true);

    const emptyState = (
        <aside className="w-80 border-r bg-card flex flex-col shrink-0 h-full">
            <div className="p-3 border-b flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Edit</h2>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground opacity-60">
                <Scaling className="w-10 h-10 mb-3 opacity-50" />
                <span className="text-sm font-medium">Select exactly one item</span>
            </div>
        </aside>
    );

    if (selectedItems.length !== 1) return emptyState;

    const item = selectedItems[0];
    const catalogEntry = catalog[item.sku];

    if (!catalogEntry) return emptyState;

    const sizeGroup = catalogEntry.appliedSizeGroup;
    const sizeOptions = sizeGroup?.options || [];
    const activeSizeChild = item.children.find((child) => catalog[child.sku]?.sizeGroupId === sizeGroup?.id);
    const parentItem = item.parentLineId ? projectedState.items[item.parentLineId] : null;
    const isComboLinkedChild = !!parentItem && !!catalog[parentItem.sku]?.comboChoices?.length;
    const isRootItem = !item.parentLineId;

    const hasInlineQty = catalogEntry.inlineQtyType && catalogEntry.inlineQtyType !== "none";
    const inlineStep = catalogEntry.inlineQtyIncrement ?? (catalogEntry.inlineQtyType === "float" ? 0.05 : 1);
    const inlineQtyLabel = catalogEntry.inlineQtyLabel ?? "Quantity";
    const inlineQtyUnit = catalogEntry.inlineQtyUnit ?? "";
    const currentInlineQty = item.inlineQty ?? 1;

    const precision = (() => {
        const text = inlineStep.toString();
        if (text.includes("e-")) return Number(text.match(/e-(\d+)$/)?.[1] || 0);
        return text.split(".")[1]?.length || 0;
    })();

    const handleSizeChange = (newSizeSku: string) => {
        if (activeSizeChild && activeSizeChild.sku !== newSizeSku) {
            useVCSStore.getState().modifyItemSku(activeSizeChild.lineId, activeSizeChild.sku, newSizeSku);
        }
    };

    return (
        <aside className="w-80 border-r bg-card flex flex-col shrink-0 shadow-sm h-full overflow-hidden" id="inline-mod-panel">
            <div className="p-3 border-b flex items-center gap-2 bg-muted/20">
                <Settings2 className="w-3.5 h-3.5 text-primary" />
                <h2 className="text-xs font-semibold text-primary uppercase tracking-wider truncate">
                    Editing: <span className="text-foreground">{item.name}</span>
                </h2>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-8">
                    {/* Main Quantity Control - Keeps placement stable */}
                    <div className="space-y-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5" />
                            Main Quantity
                        </span>
                        {MainQtyControl(
                            item,
                            isRootItem,
                            catalogEntry.mainQtyIncrement ?? 1,
                            catalogEntry.inlineQtyMainQtyLocked ?? false,
                            formatNumber,
                        )}
                    </div>
                    {/* Measurement Control Area - Reserved Fixed Space */}
                    {MeasurementQty(hasInlineQty, inlineQtyLabel, onUpdateInlineQty, item, inlineStep, formatNumber, currentInlineQty, precision, inlineQtyUnit)}
                    {/* Remove Button */}
                    {removeButton(onRemoveModifier, item, isComboLinkedChild)}

                    {/* Size Selection Area - Stacked Vertical Column */}
                    {sizeGroup && sizeOptions.length > 0 && (() => {
                        const activeSizePrice = activeSizeChild ? (catalog[activeSizeChild.sku]?.basePrice ?? 0) : 0;
                        return (
                            SizeSelection(sizeGroup, showDeltaPrice, formatNumber, activeSizePrice, setShowDeltaPrice, sizeOptions, activeSizeChild, catalog, catalogEntry, handleSizeChange)
                        );
                    })()}

                    {catalogEntry.allowedStates && catalogEntry.allowedStates.length > 0 && (
                        ModifierState(showDeltaPrice, formatNumber, catalogEntry, setShowDeltaPrice, item, onUpdateModifierState)
                    )}
                </div>
            </ScrollArea>
        </aside>
    );
}

function MainQtyControl(
    item: ProjectedLineItem,
    isEligible: boolean,
    step: number,
    isLocked: boolean,
    formatNumber: (value: number, decimals?: number, overflow_precision?: number, overflow_fraction_strategy?: NumberFractionOverflow) => string,
) {
    if (!isEligible) {
        return (
            <div className="flex items-stretch rounded-xl border bg-background shadow-sm overflow-hidden h-20">
                <div className="flex-1 flex items-center justify-center bg-muted/10 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    N/A
                </div>
            </div>
        );
    }

    if (item.status === ItemStatus.Canceled) {
        return (
            <div className="flex items-stretch rounded-xl border bg-background shadow-sm overflow-hidden h-20">
                <div className="flex w-20 items-center justify-center border-r border-destructive/20 bg-destructive/10">
                    <span className="text-3xl font-mono font-bold text-destructive">
                        {formatNumber(item.canceledQty)}
                    </span>
                </div>
                <div className="flex-1 flex items-center justify-center bg-destructive/5 text-[10px] font-semibold uppercase tracking-wide text-destructive/80">
                    Voided
                </div>
            </div>
        );
    }

    if (isLocked) {
        return (
            <div className="flex items-stretch rounded-xl border bg-background shadow-sm overflow-hidden h-20">
                <div className="flex w-20 items-center justify-center border-r bg-muted/20">
                    <Button
                        variant="ghost"
                        className="h-full w-full rounded-none hover:bg-muted"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (item.qty > step) {
                                useVCSStore.getState().modifyItemQty(item.lineId, item.qty, Math.round((item.qty - step) * 1000) / 1000);
                            } else {
                                useVCSStore.getState().removeItem(item.lineId);
                            }
                        }}
                    >
                        <Minus className="w-8 h-8" />
                    </Button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-1 bg-muted/10">
                    <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
                        Locked
                    </span>
                    <span className="text-2xl font-mono font-bold text-foreground">
                        {formatNumber(item.qty)}
                    </span>
                </div>
                <div className="flex w-20 items-center justify-center border-l bg-muted/20">
                    <Button
                        variant="ghost"
                        className="h-full w-full rounded-none hover:bg-muted"
                        onClick={(e) => {
                            e.stopPropagation();
                            useVCSStore.getState().modifyItemQty(item.lineId, item.qty, Math.round((item.qty + step) * 1000) / 1000);
                        }}
                    >
                        <Plus className="w-8 h-8" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-stretch rounded-xl border bg-background shadow-sm overflow-hidden h-20">
            <Button
                variant="ghost"
                className="h-full w-20 rounded-none border-r hover:bg-muted"
                onClick={(e) => {
                    e.stopPropagation();
                    if (item.qty > step) {
                        useVCSStore.getState().modifyItemQty(item.lineId, item.qty, Math.round((item.qty - step) * 1000) / 1000);
                    } else {
                        useVCSStore.getState().removeItem(item.lineId);
                    }
                }}
            >
                <Minus className="w-8 h-8" />
            </Button>
                <div className="flex-1 flex flex-col items-center justify-center gap-1 bg-muted/10">
                    <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
                    Qty
                    </span>
                    <span className="text-2xl font-mono font-bold text-foreground">
                        {formatNumber(item.qty)}
                    </span>
                </div>
            <Button
                variant="ghost"
                className="h-full w-20 rounded-none border-l hover:bg-muted"
                onClick={(e) => {
                    e.stopPropagation();
                    useVCSStore.getState().modifyItemQty(item.lineId, item.qty, Math.round((item.qty + step) * 1000) / 1000);
                }}
            >
                <Plus className="w-8 h-8" />
            </Button>
        </div>
    );
}

function removeButton(onRemoveModifier: (lineId: string) => void, item: ProjectedLineItem, isComboLinkedChild: boolean) {
    return <div className="space-y-3">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />
            Actions
        </span>
        <Button
            variant="outline"
            className="w-full h-12 justify-start px-4 gap-3 border-destructive/40 text-destructive hover:bg-destructive/5 hover:border-destructive/70"
            disabled={isComboLinkedChild}
            title={isComboLinkedChild ? "Combo-linked children cannot be removed here" : "Remove item"}
            onClick={() => onRemoveModifier(item.lineId)}
        >
            <Trash2 className="w-4 h-4" />
            Remove Item
        </Button>
    </div>;
}

function ModifierState(showDeltaPrice: boolean, formatNumber: (value: number, decimals?: number, overflow_precision?: number, overflow_fraction_strategy?: NumberFractionOverflow) => string, catalogEntry: CatalogItemEntry, setShowDeltaPrice: Dispatch<SetStateAction<boolean>>, item: ProjectedLineItem, onUpdateModifierState: (sku: string, state: string) => void): import("react").ReactNode {
    return <div className="space-y-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    Modifier State
                </span>
                {showDeltaPrice && (
                    <span className="text-[10px] font-mono text-muted-foreground/60">
                        base ${formatNumber(catalogEntry.basePrice, 2)}
                    </span>
                )}
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <Checkbox
                    checked={showDeltaPrice}
                    onCheckedChange={(v) => setShowDeltaPrice(!!v)}
                    className="h-3 w-3" />
                <span className="text-[10px] text-muted-foreground">
                    {showDeltaPrice ? "Delta price" : "Net price"}
                </span>
            </label>
        </div>
        <div className="flex flex-col gap-2">
            {catalogEntry.allowedStates?.map((stateOpt) => {
                const isActive = item.selectedModifierState === stateOpt.state;
                const hasPrice = stateOpt.priceOverride !== null;
                const netPrice = stateOpt.priceOverride ?? catalogEntry.basePrice;
                const delta = hasPrice ? netPrice - catalogEntry.basePrice : null;
                const priceLabel = hasPrice
                    ? showDeltaPrice
                        ? delta === 0
                            ? null
                            : `${delta! > 0 ? "+" : "-"}$${formatNumber(Math.abs(delta!), 2)}`
                        : `$${formatNumber(netPrice, 2)}`
                    : null;
                return (
                    <Button
                        key={stateOpt.state}
                        variant={isActive ? "default" : "outline"}
                        className={`h-12 justify-between px-4 ${isActive ? "ring-2 ring-primary ring-offset-1" : ""}`}
                        onClick={() => onUpdateModifierState(item.sku, stateOpt.state)}
                    >
                        <span>{stateOpt.state}</span>
                        {priceLabel && (
                            <span className={`text-xs font-mono opacity-70 ${isActive ? "" : delta !== null && delta > 0 ? "text-amber-600 dark:text-amber-400" : delta !== null && delta < 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                                {priceLabel}
                            </span>
                        )}
                    </Button>
                );
            })}
        </div>
    </div>;
}

function SizeSelection(sizeGroup: SizeGroup, showDeltaPrice: boolean, formatNumber: (value: number, decimals?: number, overflow_precision?: number, overflow_fraction_strategy?: NumberFractionOverflow) => string, activeSizePrice: number, setShowDeltaPrice: Dispatch<SetStateAction<boolean>>, sizeOptions: CatalogItemEntry[], activeSizeChild: ProjectedLineItem | undefined, catalog: Record<string, CatalogItemEntry>, catalogEntry: CatalogItemEntry, handleSizeChange: (newSizeSku: string) => void): import("react").ReactNode {
    return <div className="space-y-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Scaling className="w-3.5 h-3.5" />
                    {sizeGroup.name}
                </span>
                {showDeltaPrice && (
                    <span className="text-[10px] font-mono text-muted-foreground/60">
                        base ${formatNumber(activeSizePrice, 2)}
                    </span>
                )}
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <Checkbox
                    checked={showDeltaPrice}
                    onCheckedChange={(v) => setShowDeltaPrice(!!v)}
                    className="h-3 w-3" />
                <span className="text-[10px] text-muted-foreground">
                    {showDeltaPrice ? "Delta price" : "Net price"}
                </span>
            </label>
        </div>
        <div className="flex flex-col gap-2">
            {sizeOptions.map((opt) => {
                const isActive = activeSizeChild?.sku === opt.sku;

                // Calculate values for display
                const activeSizePrice = activeSizeChild ? (catalog[activeSizeChild.sku]?.basePrice ?? 0) : 0;
                const netPrice = catalogEntry.basePrice + opt.basePrice;
                const delta = opt.basePrice - activeSizePrice;

                const priceLabel = showDeltaPrice
                    ? delta === 0 ? null : `${delta > 0 ? "+" : "-"}$${formatNumber(Math.abs(delta), 2)}`
                    : `$${formatNumber(netPrice, 2)}`;

                return (
                    <Button
                        key={opt.sku}
                        variant={isActive ? "default" : "outline"}
                        className={`h-12 justify-between px-4 ${isActive ? "ring-2 ring-primary ring-offset-1" : ""}`}
                        onClick={() => handleSizeChange(opt.sku)}
                    >
                        <span className="font-medium">{opt.name}</span>
                        {priceLabel && (
                            <span className={`text-xs font-mono opacity-70 ${isActive
                                ? ""
                                : delta > 0
                                    ? "text-amber-600 dark:text-amber-400"
                                    : delta < 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : ""}`}>
                                {priceLabel}
                            </span>
                        )}
                    </Button>
                );
            })}
        </div>
    </div>;
}

function MeasurementQty(hasInlineQty: boolean | null | undefined, inlineQtyLabel: string, onUpdateInlineQty: (sku: string, change: number) => void, item: ProjectedLineItem, inlineStep: number, formatNumber: (value: number, decimals?: number, overflow_precision?: number, overflow_fraction_strategy?: NumberFractionOverflow) => string, currentInlineQty: number, precision: number, inlineQtyUnit: string) {
    return <div className="space-y-3">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            {hasInlineQty ? inlineQtyLabel : "Measurement"}
        </span>

        {hasInlineQty ? (
            <div className="flex items-stretch rounded-xl border bg-background shadow-sm overflow-hidden h-20">
                <Button variant="ghost" className="h-full w-20 rounded-none border-r hover:bg-muted" onClick={() => onUpdateInlineQty(item.sku, -inlineStep)}>
                    <Minus className="w-8 h-8" />
                </Button>
                <div className="flex-1 flex flex-col items-center justify-center bg-muted/10">
                    <span className="text-3xl font-mono font-bold text-foreground">{formatNumber(currentInlineQty, precision)}</span>
                    {inlineQtyUnit && <span className="text-[10px] font-medium text-muted-foreground uppercase">{inlineQtyUnit}</span>}
                </div>
                <Button variant="ghost" className="h-full w-20 rounded-none border-l hover:bg-muted" onClick={() => onUpdateInlineQty(item.sku, inlineStep)}>
                    <Plus className="w-8 h-8" />
                </Button>
            </div>
        ) : (
            <div className="h-20 flex items-center justify-center border-2 border-dashed rounded-xl text-muted-foreground/40 text-xs">
                N/A
            </div>
        )}
    </div>;
}
