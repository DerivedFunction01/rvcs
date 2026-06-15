import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CatalogItemEntry, ProjectedLineItem } from "@/lib/vcs/types";
import { CatalogItemType } from "@/lib/vcs/types";
import { useVCSStore } from "@/store/vcs-store";
import { Copy, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function LineItemActions({
    item,
    catalogEntry,
    filteredModifiers,
    isComboChoice,
    onRemove,
    onAddModifier,
    onAddNote,
    onAllocConfig,
    onDuplicateItem,
}: {
    item: ProjectedLineItem;
    catalogEntry: CatalogItemEntry | undefined;
    filteredModifiers: CatalogItemEntry[];
    isComboChoice: boolean;
    onRemove: (lineId: string) => void;
    onAddModifier: (item: ProjectedLineItem) => void;
    onAddNote: (item: ProjectedLineItem) => void;
    onAllocConfig: (item: ProjectedLineItem) => void;
    onDuplicateItem?: (lineId: string) => void;
}) {
    const isRoot = !item.parentLineId;

    return (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {(isRoot || catalogEntry?.type === CatalogItemType.Item) &&
                filteredModifiers.length > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddModifier(item);
                                }}
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                            Add modifiers
                        </TooltipContent>
                    </Tooltip>
                )}
            {(isRoot ||
                catalogEntry?.type === CatalogItemType.Item ||
                item.sku === "custom_note") && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddNote(item);
                                }}
                            >
                                <Pencil className="w-3 h-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                            {item.sku === "custom_note" ? "Edit note" : "Add note"}
                        </TooltipContent>
                    </Tooltip>
                )}
            {isRoot && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onDuplicateItem) {
                                    onDuplicateItem(item.lineId);
                                } else {
                                    useVCSStore.getState().duplicateItem(item.lineId);
                                    toast.success("Item duplicated");
                                }
                            }}
                        >
                            <Copy className="w-3 h-3" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">
                        Duplicate item
                    </TooltipContent>
                </Tooltip>
            )}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAllocConfig(item);
                        }}
                    >
                        <Settings2 className="w-3 h-3" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                    Allocation config
                </TooltipContent>
            </Tooltip>
            {!isComboChoice && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(item.lineId);
                    }}
                >
                    <Trash2 className="w-3 h-3" />
                </Button>
            )}
        </div>
    );
}