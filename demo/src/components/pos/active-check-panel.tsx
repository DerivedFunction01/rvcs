import React from "react";
import { LineItemNode } from "@/components/pos/line-item-node";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator as SeparatorUI } from "@/components/ui/separator";
import { ShoppingCart, Plus, Minus, Copy, Trash2, User, ChevronDown, AlertCircle, Layers, Clock, ChevronsUpDown, LayoutList, XCircle } from "lucide-react";
import { getGuestColor, GUEST_PALETTE } from "@/lib/pos/ui-utils";

export function ActiveCheckPanel(props: any) {
  const { activeBranch, mainBranchName, isMergedToMain, isViewingHistory, projectedState, guests, resolveGuestName, visibleGuests, setVisibleGuests, toggleAllCollapsed, hasCollapsedItems, hideCanceled, setHideCanceled, canceledCount, detailLevel, setDetailLevel, selectedPerson, filteredRootItems, resolvedAllocations, defaultPaymentAllocId, removeItem, handleOpenModifierDialog, handleOpenNoteDialog, handleAllocConfig, handleOpenSwapDialog, modifierItems, selectedLineIds, setSelectedLineIds, handleSelectToggle, collapsedItems, handleToggleCollapse, checklistRef, bulkActionsBarRef, modifyItemsQty, setQtyPadOpen, duplicateItems, setDupMoveDialogOpen, removeItems, setAssignGuestDialogOpen, setPaymentAllocationItems, setPaymentAllocationContext, setPaymentAllocationOpen, setFulfillmentAllocationItems, setFulfillmentAllocationContext, setFulfillmentAllocationOpen, compatibleModifiers, setModifierAddItem, setModifierAddOpen, activeModifiersOnSelected, setRemoveModDialogOpen, onGroupNoteOpen } = props;
  
  return (
    <main className="flex-1 flex flex-col min-w-0">
      <div className="border-b bg-card px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold">Active Check</h2>
          <Badge variant="secondary" className="text-[10px]"><Layers className="w-2.5 h-2.5 mr-1" />{activeBranch}</Badge>
          {isViewingHistory && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50"><Clock className="w-2.5 h-2.5 mr-1" />Viewing history</Badge>}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 ml-2 bg-background border hover:bg-accent"><User className="w-3.5 h-3.5 text-muted-foreground" /><span>{visibleGuests.size === guests.length ? "All Guests" : visibleGuests.size === 0 ? "No Guests" : `${visibleGuests.size}/${guests.length} Guests`}</span></Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">Filter Guests</span><div className="flex gap-2"><Button variant="link" className="h-auto p-0 text-[10px] font-semibold text-primary" onClick={() => setVisibleGuests(new Set(guests.map((g: any) => g.id)))}>Select All</Button><Button variant="link" className="h-auto p-0 text-[10px] font-semibold text-destructive" onClick={() => setVisibleGuests(new Set())}>Clear All</Button></div></div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {guests.map((g: any, idx: number) => {
                    const isVisible = visibleGuests.has(g.id);
                    return (
                      <button key={g.id} onClick={() => setVisibleGuests((prev: any) => { const next = new Set(prev); if (next.has(g.id)) next.delete(g.id); else next.add(g.id); return next; })} className={`flex items-center gap-2 px-2.5 py-1.5 border rounded-lg text-left text-xs transition-all ${isVisible ? "border-primary bg-primary/5 font-medium" : "border-border bg-card opacity-60 hover:opacity-100"}`}><div className={`w-2 h-2 rounded-full shrink-0 ${GUEST_PALETTE[idx % GUEST_PALETTE.length]}`} /><span className="truncate flex-1">{g.alias || `Guest ${g.number}`}</span></button>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-1 text-muted-foreground hover:bg-accent" onClick={toggleAllCollapsed}><ChevronsUpDown className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent side="bottom" className="text-xs">{hasCollapsedItems ? "Expand all" : "Collapse all"}</TooltipContent></Tooltip>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-1 text-muted-foreground hover:bg-accent relative"><LayoutList className="w-4 h-4" />{hideCanceled && canceledCount > 0 && <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 flex items-center justify-center px-1 text-[8px] border-background">{canceledCount}</Badge>}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 text-[10px]">Item Detail Level</p>
                {(["simple", "balanced", "full"] as const).map(level => (
                  <button key={level} onClick={() => setDetailLevel(level)} className={`w-full flex flex-col px-2 py-1.5 rounded transition-colors text-left ${detailLevel === level ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"}`}><span className="font-medium capitalize">{level}</span></button>
                ))}
                <div className="my-1 border-t" />
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer transition-colors"><Checkbox checked={hideCanceled} onCheckedChange={(v) => setHideCanceled(!!v)} className="w-3.5 h-3.5" /><span className="font-medium text-foreground">Hide voided items</span></label>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-4">
          {(() => {
            const breakdown = projectedState.financials.personBreakdown;
            const sorted = [...breakdown.filter((pb: any) => pb.subtotal > 0 || pb.person === selectedPerson)].sort((a, b) => a.person === selectedPerson ? -1 : b.person === selectedPerson ? 1 : b.subtotal - a.subtotal);
            const visible = sorted.slice(0, 3);
            return (
              <>
                {visible.map((pb: any) => (
                  <div key={pb.person} className="text-right">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end"><div className={`w-1.5 h-1.5 rounded-full ${getGuestColor(pb.person, guests)}`} /><span className="truncate max-w-17.5">{resolveGuestName(pb.person)}</span></div>
                    <div className="font-mono font-bold text-sm tabular-nums">${pb.subtotal.toFixed(2)}</div>
                  </div>
                ))}
              </>
            );
          })()}
          <SeparatorUI orientation="vertical" className="h-8" />
          <div className="text-right"><div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Subtotal</div><div className="font-mono font-bold text-sm tabular-nums text-muted-foreground">${projectedState.financials.subtotal.toFixed(2)}</div></div>
          {projectedState.financials.chargeTotal > 0 && (
            <Popover><PopoverTrigger asChild><button className="text-right hover:bg-accent px-1 rounded transition-colors cursor-pointer flex flex-col items-end"><div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">Tax & Fees <ChevronDown className="w-2.5 h-2.5" /></div><div className="font-mono font-bold text-sm tabular-nums text-muted-foreground">${projectedState.financials.chargeTotal.toFixed(2)}</div></button></PopoverTrigger><PopoverContent className="w-64 p-3" align="end"><div className="space-y-2"><h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Charge Breakdown</h4><div className="space-y-1">{projectedState.financials.chargeBreakdown.map((charge: any, idx: number) => (<div key={idx} className="flex justify-between items-center text-xs"><span className="truncate pr-2 text-muted-foreground">{charge.label}</span><span className="font-mono font-medium tabular-nums">${charge.chargeAmount.toFixed(2)}</span></div>))}</div></div></PopoverContent></Popover>
          )}
          <div className="text-right bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10"><div className="text-[10px] text-primary/80 uppercase tracking-wider font-bold">Total</div><div className="font-mono font-bold text-lg tabular-nums text-primary leading-tight">${projectedState.financials.grandTotal.toFixed(2)}</div></div>
        </div>
      </div>
      {(activeBranch === mainBranchName || isMergedToMain) && !isViewingHistory && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-900/50 px-6 py-2.5 flex items-start gap-2.5 shrink-0"><AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" /><p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed"><strong className="font-semibold uppercase tracking-wider text-[10px] mr-1.5">{activeBranch === mainBranchName ? "Read-Only Trunk:" : "Merged Branch:"}</strong>{activeBranch === mainBranchName ? "Main is purely a read-only place. Any modifications made here will automatically create a new draft branch to protect the main ledger." : "This branch has already been merged into main and is read-only. Any modifications made here will automatically create a new draft branch."}</p></div>
      )}
      <div ref={checklistRef} className="flex-1 overflow-y-auto">
        {filteredRootItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50"><ShoppingCart className="w-12 h-12 mb-3" /><p className="text-sm font-medium">No items in check</p><p className="text-xs mt-1">Select items from the catalog to begin</p></div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredRootItems.map((item: any) => (
              <LineItemNode key={item.lineId} item={item} allocations={resolvedAllocations} defaultPaymentAllocId={defaultPaymentAllocId} onRemove={removeItem} onAddModifier={handleOpenModifierDialog} onAddNote={handleOpenNoteDialog} onAllocConfig={handleAllocConfig} onSwapComboChoice={handleOpenSwapDialog} depth={0} modifiers={modifierItems} guests={guests} isSelected={selectedLineIds.has(item.lineId)} onSelectToggle={handleSelectToggle} isCollapsed={collapsedItems.has(item.lineId)} onToggleCollapse={handleToggleCollapse} collapsedItems={collapsedItems} detailLevel={detailLevel} hideCanceled={hideCanceled} />
            ))}
          </div>
        )}
      </div>
      {selectedLineIds.size > 0 && (
        <div ref={bulkActionsBarRef} className="mx-4 my-2 p-3 bg-card/85 backdrop-blur-md border rounded-xl shadow-lg flex flex-col gap-3 animate-in slide-in-from-bottom-2 duration-200 shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2"><Checkbox checked={selectedLineIds.size > 0 && selectedLineIds.size === filteredRootItems.length} onCheckedChange={(c) => { if (c) setSelectedLineIds(new Set(filteredRootItems.map((i: any) => i.lineId))); else setSelectedLineIds(new Set()); }} /><span className="text-xs font-semibold text-foreground select-none">{selectedLineIds.size} selected</span></div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0" onClick={() => setSelectedLineIds(new Set())}><XCircle className="w-4 h-4" /></Button>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1 bg-muted/30 border p-1 rounded-lg">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 select-none">Qty</span>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent" onClick={() => { modifyItemsQty(Array.from(selectedLineIds), -1); }}><Minus className="w-3.5 h-3.5 mr-1" />- 1</Button>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent" onClick={() => { modifyItemsQty(Array.from(selectedLineIds), 1); }}><Plus className="w-3.5 h-3.5 mr-1" />+ 1</Button>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent" onClick={() => setQtyPadOpen(true)}>Set Qty</Button>
            </div>
            <div className="flex items-center gap-1 bg-muted/30 border p-1 rounded-lg">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 select-none">Action</span>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent" onClick={() => duplicateItems(Array.from(selectedLineIds))}><Copy className="w-3.5 h-3.5 mr-1" />Duplicate</Button>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent" onClick={() => setDupMoveDialogOpen(true)}>Dup & Move</Button>
              <Button variant="destructive" size="sm" className="h-7 text-[11px] px-2.5 font-medium hover:bg-destructive/90" onClick={() => { removeItems(Array.from(selectedLineIds)); setSelectedLineIds(new Set()); }}><Trash2 className="w-3.5 h-3.5 mr-1" />Remove</Button>
            </div>
            <div className="flex items-center gap-1 bg-muted/30 border p-1 rounded-lg">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 select-none">Assign</span>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent" onClick={() => setAssignGuestDialogOpen(true)}>Guest</Button>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent" onClick={() => { setPaymentAllocationItems(Array.from(selectedLineIds).map(id => projectedState.items[id as string]).filter(Boolean)); setPaymentAllocationContext("group"); setPaymentAllocationOpen(true); }}>Payment</Button>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent" onClick={() => { setFulfillmentAllocationItems(Array.from(selectedLineIds).map(id => projectedState.items[id as string]).filter(Boolean)); setFulfillmentAllocationContext("group"); setFulfillmentAllocationOpen(true); }}>Fulfillment</Button>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent" onClick={() => onGroupNoteOpen(Array.from(selectedLineIds))}>Group Note</Button>
            </div>
            {(compatibleModifiers.length > 0 || activeModifiersOnSelected.length > 0) && (
              <div className="flex items-center gap-1 bg-muted/30 border p-1 rounded-lg">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 select-none">Mods</span>
                {compatibleModifiers.length > 0 && <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm text-primary hover:bg-primary/5 gap-1" onClick={() => { setModifierAddItem(null); setModifierAddOpen(true); }}><Plus className="w-3.5 h-3.5" /> Add</Button>}
                {activeModifiersOnSelected.length > 0 && <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm text-destructive hover:bg-destructive/5 gap-1" onClick={() => setRemoveModDialogOpen(true)}><Minus className="w-3.5 h-3.5" /> Remove</Button>}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}