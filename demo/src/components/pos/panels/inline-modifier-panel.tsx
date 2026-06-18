import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NumberFractionOverflow, useFormatNumber } from "@/components/pos/hooks/use-format-number";
import type { CatalogItemEntry, ProjectedLineItem, SizeGroup } from "@/lib/vcs/types";
import { ItemStatus } from "@/lib/vcs/types";
import { Settings2, Minus, Pencil, Plus, Scale, Scaling, StickyNote, Trash2, Workflow, Zap } from "lucide-react";
import { NumberPadDialog } from "@/components/pos/dialogs/number-pad-dialog";
import { useVCSStore } from "@/store/vcs-store";
import { usePreferencesStore } from "@/store/preferences-store";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";

export interface InlineModifierPanelProps {
    selectedItems: ProjectedLineItem[];
    catalog: Record<string, CatalogItemEntry>;
    compatibleModifiers: CatalogItemEntry[];
    onAddModifier: (sku: string, state?: string) => void;
    onEditModifiers: (item: ProjectedLineItem) => void;
    onAllocConfig: (item: ProjectedLineItem) => void;
    onSwapComboChoice: (lineId: string, parentLineId: string, slotSku: string) => void;
    onRemoveModifier: (lineId: string) => void;
    onGroupNoteOpen: (ids: string[]) => void;
    onUpdateModifierState: (sku: string, state: string) => void;
    onUpdateInlineQty: (sku: string, change: number) => void;
}

export function InlineModifierPanel({
    selectedItems,
    catalog,
    compatibleModifiers,
    onRemoveModifier,
    onEditModifiers,
    onAllocConfig,
    onSwapComboChoice,
    onGroupNoteOpen,
    onUpdateModifierState,
    onUpdateInlineQty,
}: InlineModifierPanelProps) {
    const formatNumber = useFormatNumber();
    const projectedState = useVCSStore((state) => state.projectedState);
    const defaultShowDeltaPrice = usePreferencesStore((state) => state.defaultPrefs.inlineModifierPriceDisplayDelta);
    const [showDeltaPrice, setShowDeltaPrice] = useState(defaultShowDeltaPrice);
    const [padTarget, setPadTarget] = useState<"main" | "inline" | null>(null);
    const [qtyMode, setQtyMode] = useState<"main" | "inline">("main");
    const [sizePage, setSizePage] = useState(0);
    const [statePage, setStatePage] = useState(0);

    useEffect(() => {
        setShowDeltaPrice(defaultShowDeltaPrice);
    }, [defaultShowDeltaPrice]);

    const item = selectedItems.length === 1 ? selectedItems[0] : null;
    const catalogEntry = item ? catalog[item.sku] : null;

    const sizeGroup = catalogEntry?.appliedSizeGroup;
    const sizeOptions = sizeGroup?.options || [];
    const activeSizeChild = item ? item.children.find((child) => catalog[child.sku]?.sizeGroupId === sizeGroup?.id) : undefined;
    const parentItem = item?.parentLineId ? projectedState.items[item.parentLineId] : null;
    const isComboLinkedChild = !!parentItem && !!catalog[parentItem.sku]?.comboChoices?.length;
    const hasEditableModifiers = !!item && (
        (catalogEntry?.allowedModifiers?.length ?? 0) > 0 ||
        compatibleModifiers.length > 0 ||
        item.children.some((child) => {
            const childEntry = catalog[child.sku];
            return !!childEntry && childEntry.basePrice === 0;
        })
    );
    const isRootItem = !item?.parentLineId;
    const mainQtyLocked = catalogEntry?.inlineQtyMainQtyLocked ?? false;

    const hasInlineQty = catalogEntry?.inlineQtyType && catalogEntry.inlineQtyType !== "none";
    const shouldDefaultToInline = !!hasInlineQty && (!isRootItem || mainQtyLocked);
    const mainQtyDisabled = mainQtyLocked || !isRootItem;
    const inlineStep = catalogEntry?.inlineQtyIncrement ?? (catalogEntry?.inlineQtyType === "float" ? 0.05 : 1);
    const inlineQtyLabel = catalogEntry?.inlineQtyLabel ?? "Quantity";
    const inlineQtyUnit = catalogEntry?.inlineQtyUnit ?? "";
    const currentInlineQty = item?.inlineQty ?? 1;

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

    const sizePageSize = 6;
    const statePageSize = 8;

    const pagedSizeOptions = useMemo(() => {
        const start = sizePage * sizePageSize;
        return sizeOptions.slice(start, start + sizePageSize);
    }, [sizeOptions, sizePage]);

    const pagedStates = useMemo(() => {
        const states = catalogEntry?.allowedStates || [];
        const start = statePage * statePageSize;
        return states.slice(start, start + statePageSize);
    }, [catalogEntry?.allowedStates, statePage]);

    useEffect(() => {
        if (selectedItems.length === 1) {
            setSizePage(0);
        }
    }, [selectedItems.length, item?.lineId, sizeGroup?.id]);

    useEffect(() => {
        if (selectedItems.length === 1) {
            setStatePage(0);
        }
    }, [selectedItems.length, item?.lineId, item?.sku]);

    useEffect(() => {
        setQtyMode(shouldDefaultToInline ? "inline" : "main");
    }, [shouldDefaultToInline, item?.lineId, item?.sku]);

    const emptyState = (
        <aside className="w-96 border-r bg-card flex flex-col shrink-0 h-full">
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

    if (!item || !catalogEntry) return emptyState;

    return (
        <aside className="w-96 border-r bg-card flex flex-col shrink-0 shadow-sm h-full overflow-hidden" id="inline-mod-panel">
            <div className="p-3 border-b flex items-center gap-2 bg-muted/20">
                <Settings2 className="w-3.5 h-3.5 text-primary" />
                <h2 className="text-xs font-semibold text-primary uppercase tracking-wider truncate">
                    Editing: <span className="text-foreground">{item.name}</span>
                </h2>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-8">
                    <div className="space-y-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5" />
                            Quantity
                        </span>
                        <div className="rounded-xl border bg-muted/20 px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                                        Type
                                    </span>
                                </div>
                                {hasInlineQty ? (
                                    <div className="inline-flex items-stretch rounded-full border bg-background p-1 shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setQtyMode("main")}
                                            disabled={mainQtyDisabled}
                                            className={`min-w-16 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${qtyMode === "main" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                                        >
                                            Main
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setQtyMode("inline")}
                                            className={`min-w-20 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${qtyMode === "inline" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                                        >
                                            Measurement
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Main only
                                    </div>
                                )}
                            </div>
                        </div>
                        {hasInlineQty ? (
                            qtyMode === "main" && !shouldDefaultToInline
                                ? MainQtyControl(
                                    item,
                                    isRootItem,
                                    catalogEntry.mainQtyIncrement ?? 1,
                                    catalogEntry.inlineQtyMainQtyLocked ?? false,
                                    formatNumber,
                                    () => setPadTarget("main"),
                                )
                                : MeasurementQty(
                                    hasInlineQty,
                                    inlineQtyLabel,
                                    onUpdateInlineQty,
                                    item,
                                    inlineStep,
                                    formatNumber,
                                    currentInlineQty,
                                    precision,
                                    inlineQtyUnit,
                                    () => setPadTarget("inline"),
                                )
                        ) : (
                            MainQtyControl(
                                item,
                                isRootItem,
                                catalogEntry.mainQtyIncrement ?? 1,
                                catalogEntry.inlineQtyMainQtyLocked ?? false,
                                formatNumber,
                                () => setPadTarget("main"),
                            )
                        )}
                    </div>
                    {/* Actions */}
                    {actionGrid(item, onEditModifiers, onAllocConfig, onSwapComboChoice, onRemoveModifier, onGroupNoteOpen, isComboLinkedChild, hasEditableModifiers)}
                    {DeltaNetToggle(showDeltaPrice, setShowDeltaPrice)}

                    {/* Size Selection Area - Stacked Vertical Column */}
                    {sizeGroup && sizeOptions.length > 0 && (() => {
                        const activeSizePrice = activeSizeChild ? (catalog[activeSizeChild.sku]?.basePrice ?? 0) : 0;
                        return (
                            SizeSelection(sizeGroup, showDeltaPrice, formatNumber, activeSizePrice, pagedSizeOptions, activeSizeChild, catalog, catalogEntry, handleSizeChange, sizePage, sizePageSize, sizeOptions.length, () => setSizePage((prev) => prev + 1), () => setSizePage((prev) => Math.max(0, prev - 1)))
                        );
                    })()}

                    {catalogEntry.allowedStates && catalogEntry.allowedStates.length > 0 && (
                        ModifierState(showDeltaPrice, formatNumber, catalogEntry, item, onUpdateModifierState, pagedStates, statePage, statePageSize, catalogEntry.allowedStates.length, () => setStatePage((prev) => prev + 1), () => setStatePage((prev) => Math.max(0, prev - 1)))
                    )}
                </div>
            </ScrollArea>
            {padTarget && (
                <NumberPadDialog
                    open={padTarget !== null}
                    onOpenChange={(open) => {
                        if (!open) setPadTarget(null);
                    }}
                    title={padTarget === "main" ? "Quantity" : "Measurement"}
                    description={`Set the ${padTarget === "main" ? "quantity" : "measurement"} for ${item.name}`}
                    initialValue={padTarget === "main" ? item.qty : (item.inlineQty ?? 1)}
                    min={padTarget === "main" ? (catalogEntry.mainQtyIncrement ?? 1) : inlineStep}
                    increment={padTarget === "main" ? (catalogEntry.mainQtyIncrement ?? 1) : inlineStep}
                    onConfirm={(val) => {
                        if (padTarget === "main") {
                            useVCSStore.getState().modifyItemQty(item.lineId, item.qty, val);
                        } else {
                            useVCSStore.getState().modifyItemInlineQty(item.lineId, item.inlineQty ?? 1, val);
                        }
                    }}
                />
            )}
        </aside>
    );
}

function MainQtyControl(
    item: ProjectedLineItem,
    isEligible: boolean,
    step: number,
    isLocked: boolean,
    formatNumber: (value: number, decimals?: number, overflow_precision?: number, overflow_fraction_strategy?: NumberFractionOverflow) => string,
    onOpenPad: () => void,
) {
    if (!isEligible) {
        return (
            <div className="flex items-stretch rounded-xl border bg-background shadow-sm overflow-hidden h-14">
                <div className="flex-1 flex items-center justify-center bg-muted/10 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    N/A
                </div>
            </div>
        );
    }

    if (item.status === ItemStatus.Canceled) {
        return (
            <div className="flex items-stretch rounded-xl border bg-background shadow-sm overflow-hidden h-14">
                <div className="flex w-14 items-center justify-center border-r border-destructive/20 bg-destructive/10">
                    <span className="text-xl font-mono font-bold text-destructive">
                        {formatNumber(item.canceledQty)}
                    </span>
                </div>
                <div className="flex-1 flex items-center justify-center bg-destructive/5 text-[9px] font-semibold uppercase tracking-wide text-destructive/80">
                    Voided
                </div>
            </div>
        );
    }

    if (isLocked) {
        return (
            <div className="flex items-stretch rounded-xl border bg-background shadow-sm overflow-hidden h-14">
                <div className="flex w-14 items-center justify-center border-r bg-muted/20">
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
                        <Minus className="w-5 h-5" />
                    </Button>
                </div>
                <button
                    type="button"
                    className="flex-1 min-h-0 self-stretch flex flex-col items-center justify-center gap-0.5 bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors px-2 py-1"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenPad();
                    }}
                >
                    <span className="text-[8px] font-medium text-muted-foreground uppercase tracking-wide">
                        Locked
                    </span>
                    <span className="text-xl font-mono font-bold text-foreground leading-none">
                        {formatNumber(item.qty)}
                    </span>
                </button>
                <div className="flex w-14 items-center justify-center border-l bg-muted/20">
                    <Button
                        variant="ghost"
                        className="h-full w-full rounded-none hover:bg-muted"
                        onClick={(e) => {
                            e.stopPropagation();
                            useVCSStore.getState().modifyItemQty(item.lineId, item.qty, Math.round((item.qty + step) * 1000) / 1000);
                        }}
                    >
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-stretch rounded-xl border bg-background shadow-sm overflow-hidden h-14">
            <Button
                variant="ghost"
                className="h-full w-14 rounded-none border-r hover:bg-muted"
                onClick={(e) => {
                    e.stopPropagation();
                    if (item.qty > step) {
                        useVCSStore.getState().modifyItemQty(item.lineId, item.qty, Math.round((item.qty - step) * 1000) / 1000);
                    } else {
                        useVCSStore.getState().removeItem(item.lineId);
                    }
                }}
            >
                <Minus className="w-5 h-5" />
            </Button>
            <button
                type="button"
                className="flex-1 min-h-0 self-stretch flex flex-col items-center justify-center gap-0.5 bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors px-2 py-1"
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenPad();
                }}
            >
                <span className="text-[8px] font-medium text-muted-foreground uppercase tracking-wide">
                    Qty
                </span>
                <span className="text-xl font-mono font-bold text-foreground leading-none">
                    {formatNumber(item.qty)}
                </span>
            </button>
            <Button
                variant="ghost"
                className="h-full w-14 rounded-none border-l hover:bg-muted"
                onClick={(e) => {
                    e.stopPropagation();
                    useVCSStore.getState().modifyItemQty(item.lineId, item.qty, Math.round((item.qty + step) * 1000) / 1000);
                }}
            >
                <Plus className="w-5 h-5" />
            </Button>
        </div>
    );
}

function actionGrid(
    item: ProjectedLineItem,
    onEditModifiers: (item: ProjectedLineItem) => void,
    onAllocConfig: (item: ProjectedLineItem) => void,
    onSwapComboChoice: (lineId: string, parentLineId: string, slotSku: string) => void,
    onRemoveModifier: (lineId: string) => void,
    onGroupNoteOpen: (ids: string[]) => void,
    isComboLinkedChild: boolean,
    hasEditableModifiers: boolean,
) {
    const comboSwapTarget = isComboLinkedChild && item.parentLineId
        ? (() => {
            const parentItem = useVCSStore.getState().projectedState.items[item.parentLineId!];
            const parentCatalogEntry = parentItem ? useVCSStore.getState().catalog[parentItem.sku] : null;
            return parentCatalogEntry?.comboChoices?.find((choice) => choice.optionSku === item.sku) ?? null;
        })()
        : null;
    const canSwitchCombo = !!comboSwapTarget;
    return <div className="space-y-3">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Actions
        </span>
        <div className="grid grid-cols-2 gap-2">
            <Button
                variant="outline"
                className="h-14 flex flex-col items-center justify-center gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5 hover:border-destructive/70"
                disabled={isComboLinkedChild}
                title={isComboLinkedChild ? "Combo-linked children cannot be removed here" : "Remove item"}
                onClick={() => onRemoveModifier(item.lineId)}
            >
                <Trash2 className="w-5 h-5" />
                <span className="text-[10px] font-semibold leading-tight">Remove</span>
            </Button>
            <Button
                variant="outline"
                className="h-14 flex flex-col items-center justify-center gap-1.5 border-primary/20 hover:border-primary/45 shadow-xs hover:bg-accent/60 disabled:opacity-40 disabled:pointer-events-none"
                disabled={!hasEditableModifiers}
                title={hasEditableModifiers ? "Manage ingredients and options" : "No editable modifiers available"}
                onClick={() => onEditModifiers(item)}
            >
                <Pencil className="w-5 h-5 text-primary" />
                <span className="text-[10px] font-semibold text-primary leading-tight">Edit Modifiers</span>
            </Button>
            <Button
                variant="outline"
                className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-xs hover:bg-accent/60"
                onClick={() => onGroupNoteOpen([item.lineId])}
            >
                <StickyNote className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] font-semibold leading-tight">Add Note</span>
            </Button>
            <Button
                variant="outline"
                className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-xs hover:bg-accent/60"
                onClick={() => onAllocConfig(item)}
            >
                <Settings2 className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] font-semibold leading-tight">Allocation</span>
            </Button>
            <Button
                variant="outline"
                className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-xs hover:bg-accent/60 disabled:opacity-40 disabled:pointer-events-none"
                disabled={!canSwitchCombo}
                title={canSwitchCombo ? "Switch combo choice" : "No alternate combo choice available"}
                onClick={() => {
                    if (comboSwapTarget && item.parentLineId) {
                        onSwapComboChoice(item.lineId, item.parentLineId, comboSwapTarget.slotSku);
                    }
                }}
            >
                <Workflow className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] font-semibold leading-tight">Switch</span>
            </Button>
        </div>
    </div>;
}

function DeltaNetToggle(showDeltaPrice: boolean, setShowDeltaPrice: Dispatch<SetStateAction<boolean>>) {
    return (
        <div className="rounded-xl border bg-muted/20 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        Price Display
                    </span>
                </div>
                <div className="inline-flex items-stretch rounded-full border bg-background p-1 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setShowDeltaPrice(true)}
                        className={`min-w-16 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${showDeltaPrice ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Delta
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowDeltaPrice(false)}
                        className={`min-w-16 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${!showDeltaPrice ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Net
                    </button>
                </div>
            </div>
        </div>
    );
}

function ModifierState(showDeltaPrice: boolean, formatNumber: (value: number, decimals?: number, overflow_precision?: number, overflow_fraction_strategy?: NumberFractionOverflow) => string, catalogEntry: CatalogItemEntry, item: ProjectedLineItem, onUpdateModifierState: (sku: string, state: string) => void, states: NonNullable<CatalogItemEntry["allowedStates"]>, currentPage: number, pageSize: number, totalStates: number, onNextPage: () => void, onPrevPage: () => void): import("react").ReactNode {
    const ghostStateCount = Math.max(0, pageSize - states.length);
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
        </div>
        <div className="grid grid-cols-2 gap-2">
            {states.map((stateOpt) => {
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
            {Array.from({ length: ghostStateCount }).map((_, index) => (
                <div
                    key={`ghost-state-${currentPage}-${index}`}
                    className="h-12 rounded-md border border-dashed border-transparent opacity-0 pointer-events-none"
                    aria-hidden="true"
                />
            ))}
            <div className="grid grid-cols-2 gap-2">
                {currentPage > 0 ? (
                    <Button
                        variant="ghost"
                        className="h-12 justify-center gap-2 text-muted-foreground hover:text-foreground"
                        onClick={onPrevPage}
                    >
                        Prev Page
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        className="h-12 justify-center gap-2 opacity-0 pointer-events-none"
                        tabIndex={-1}
                        aria-hidden="true"
                    >
                        Prev Page
                    </Button>
                )}
                {(currentPage + 1) * pageSize < totalStates ? (
                    <Button
                        variant="ghost"
                        className="h-12 justify-center gap-2 text-muted-foreground hover:text-foreground"
                        onClick={onNextPage}
                    >
                        Next Page
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        className="h-12 justify-center gap-2 opacity-0 pointer-events-none"
                        tabIndex={-1}
                        aria-hidden="true"
                    >
                        Next Page
                    </Button>
                )}
            </div>
        </div>
    </div>;
}

function SizeSelection(sizeGroup: SizeGroup, showDeltaPrice: boolean, formatNumber: (value: number, decimals?: number, overflow_precision?: number, overflow_fraction_strategy?: NumberFractionOverflow) => string, activeSizePrice: number, sizeOptions: CatalogItemEntry[], activeSizeChild: ProjectedLineItem | undefined, catalog: Record<string, CatalogItemEntry>, catalogEntry: CatalogItemEntry, handleSizeChange: (newSizeSku: string) => void, currentPage: number, pageSize: number, totalSizes: number, onNextPage: () => void, onPrevPage: () => void): import("react").ReactNode {
    const ghostSizeCount = Math.max(0, pageSize - sizeOptions.length);
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
        </div>
        <div className="grid grid-cols-2 gap-2">
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
            {Array.from({ length: ghostSizeCount }).map((_, index) => (
                <div
                    key={`ghost-size-${currentPage}-${index}`}
                    className="h-12 rounded-md border border-dashed border-transparent opacity-0 pointer-events-none"
                    aria-hidden="true"
                />
            ))}
            <div className="grid grid-cols-2 gap-2">
                {currentPage > 0 ? (
                    <Button
                        variant="ghost"
                        className="h-12 justify-center gap-2 text-muted-foreground hover:text-foreground"
                        onClick={onPrevPage}
                    >
                        Prev Page
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        className="h-12 justify-center gap-2 opacity-0 pointer-events-none"
                        tabIndex={-1}
                        aria-hidden="true"
                    >
                        Prev Page
                    </Button>
                )}
                {(currentPage + 1) * pageSize < totalSizes ? (
                    <Button
                        variant="ghost"
                        className="h-12 justify-center gap-2 text-muted-foreground hover:text-foreground"
                        onClick={onNextPage}
                    >
                        Next Page
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        className="h-12 justify-center gap-2 opacity-0 pointer-events-none"
                        tabIndex={-1}
                        aria-hidden="true"
                    >
                        Next Page
                    </Button>
                )}
            </div>
        </div>
    </div>;
}

function MeasurementQty(hasInlineQty: boolean | null | undefined, inlineQtyLabel: string, onUpdateInlineQty: (sku: string, change: number) => void, item: ProjectedLineItem, inlineStep: number, formatNumber: (value: number, decimals?: number, overflow_precision?: number, overflow_fraction_strategy?: NumberFractionOverflow) => string, currentInlineQty: number, precision: number, inlineQtyUnit: string, onOpenPad: () => void) {
    return <div className="flex items-stretch rounded-xl border bg-background shadow-sm overflow-hidden h-14">
        <Button variant="ghost" className="h-full w-14 rounded-none border-r hover:bg-muted" onClick={() => onUpdateInlineQty(item.sku, -inlineStep)} disabled={!hasInlineQty}>
            <Minus className="w-5 h-5" />
        </Button>
        {hasInlineQty ? (
            <button
                type="button"
                className="flex-1 min-h-0 self-stretch flex flex-col items-center justify-center gap-0.5 bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors px-2 py-1"
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenPad();
                }}
            >
                <span className="text-xl font-mono font-bold text-foreground leading-none">
                    {formatNumber(currentInlineQty, precision)}
                </span>
                {inlineQtyUnit && <span className="text-[8px] font-medium text-muted-foreground uppercase">{inlineQtyUnit}</span>}
            </button>
        ) : (
            <div className="flex-1 min-h-0 self-stretch flex items-center justify-center bg-muted/10 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                N/A
            </div>
        )}
        <Button variant="ghost" className="h-full w-14 rounded-none border-l hover:bg-muted" onClick={() => onUpdateInlineQty(item.sku, inlineStep)} disabled={!hasInlineQty}>
            <Plus className="w-5 h-5" />
        </Button>
    </div>;
}
