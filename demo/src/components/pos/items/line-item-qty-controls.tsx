import { Button } from "@/components/ui/button";
import { useVCSStore } from "@/store/vcs-store";
import { Minus, Plus } from "lucide-react";

export function LineItemMainQty({
    lineId,
    qty,
    step,
    isCanceled,
    canceledQty,
    isLocked,
    formatNumber,
    onOpenPad,
}: {
    lineId: string;
    qty: number;
    step: number;
    isCanceled: boolean;
    canceledQty: number;
    isLocked: boolean;
    formatNumber: (val: number) => string;
    onOpenPad: () => void;
}) {
    if (isCanceled) {
        return (
            <div className="flex items-center gap-1 border rounded-md px-1 py-0.5 bg-destructive/10 border-destructive/20 shrink-0">
                <span className="text-[10px] text-destructive font-mono font-semibold min-w-2.5 px-2 text-center select-none">
                    {formatNumber(canceledQty)}
                </span>
            </div>
        );
    }

    if (isLocked) {
        return (
            <span className="text-[10px] text-muted-foreground font-mono font-semibold min-w-2.5 text-center select-none">
                {formatNumber(qty)}
            </span>
        );
    }

    return (
        <div className="flex items-center gap-1 border rounded-md px-1 py-0.5 bg-muted/40 shrink-0">
            <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-background"
                onClick={(e) => {
                    e.stopPropagation();
                    if (qty > step) {
                        useVCSStore
                            .getState()
                            .modifyItemQty(lineId, qty, Math.round((qty - step) * 1000) / 1000);
                    } else {
                        useVCSStore.getState().removeItem(lineId);
                    }
                }}
            >
                <Minus className="w-2.5 h-2.5" />
            </Button>
            <button
                className="text-[10px] text-foreground font-mono font-semibold min-w-6 px-1 text-center select-none hover:bg-background rounded transition-colors cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenPad();
                }}
            >
                {formatNumber(qty)}
            </button>
            <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-background"
                onClick={(e) => {
                    e.stopPropagation();
                    useVCSStore
                        .getState()
                        .modifyItemQty(lineId, qty, Math.round((qty + step) * 1000) / 1000);
                }}
            >
                <Plus className="w-2.5 h-2.5" />
            </Button>
        </div>
    );
}

export function LineItemInlineQty({
    lineId,
    inlineQty,
    inlineStep,
    inlineQtyLabel,
    inlineQtyUnit,
    formatInlineQty,
    onOpenPad,
}: {
    lineId: string;
    inlineQty: number;
    inlineStep: number;
    inlineQtyLabel: string;
    inlineQtyUnit: string;
    formatInlineQty: (val: number) => string;
    onOpenPad: () => void;
}) {
    return (
        <div className="flex items-center gap-1 mt-2">
            <span className="text-[10px] text-muted-foreground mr-1">
                {inlineQtyLabel}:
            </span>
            <div className="flex items-center rounded border p-0.5 bg-muted/20 shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 hover:bg-background"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (inlineQty > inlineStep) {
                            const next = Math.round((inlineQty - inlineStep) * 100) / 100;
                            useVCSStore.getState().modifyItemInlineQty(lineId, inlineQty, next);
                        }
                    }}
                >
                    <Minus className="w-3 h-3" />
                </Button>
                <button
                    className="text-[10px] text-foreground font-mono font-semibold min-w-8 text-center select-none px-1 hover:bg-background rounded transition-colors cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenPad();
                    }}
                >
                    {formatInlineQty(inlineQty)}
                    {inlineQtyUnit ? ` ${inlineQtyUnit}` : ""}
                </button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 hover:bg-background"
                    onClick={(e) => {
                        e.stopPropagation();
                        const next = Math.round((inlineQty + inlineStep) * 100) / 100;
                        useVCSStore.getState().modifyItemInlineQty(lineId, inlineQty, next);
                    }}
                >
                    <Plus className="w-3 h-3" />
                </Button>
            </div>
        </div>
    );
}