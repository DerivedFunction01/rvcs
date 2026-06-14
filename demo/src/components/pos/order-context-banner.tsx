import React from "react";
import { useVCSStore } from "@/store/vcs-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, User, Phone, MapPin, UserPlus, Clock } from "lucide-react";
import { ORDER_TYPE_ICONS } from "@/lib/pos/ui-utils";
import { toast } from "sonner";
import { OrderType } from "@/lib/pos/types";

export function OrderContextBanner({
  context,
  onEditClick,
  children,
}: {
  context: {
    orderType: OrderType;
    orderTypeLabel: string;
    customerFields: Record<string, string>;
    estimatedTimeLabel?: string | null;
  };
  onEditClick?: () => void;
  children?: React.ReactNode;
}) {
  const TypeIcon = ORDER_TYPE_ICONS[context.orderType] ?? ShoppingCart;

  return (
    <div className="px-6 py-2 bg-primary/5 border-b flex items-center gap-4 text-xs shrink-0">
      <div className="flex items-center gap-1.5">
        <Select
          value={context.orderType}
          onValueChange={(val) => {
            const labels: Record<string, string> = {
              [OrderType.WalkIn]: "Walk In",
              [OrderType.Pickup]: "Pickup",
              [OrderType.Delivery]: "Delivery",
            };
            useVCSStore.getState().updateOrderType(val as OrderType, labels[val] || val);
            toast.success(`Order type changed to ${labels[val] || val}`);
          }}
        >
          <SelectTrigger className="h-6 px-1.5 border-primary/20 bg-background/50 hover:bg-background text-primary font-semibold text-[11px] gap-1.5 rounded-md focus:ring-0">
            <div className="flex items-center gap-1.5">
              {React.createElement(
                TypeIcon,
                { className: "w-3 h-3 text-primary shrink-0" },
              )}
              <SelectValue placeholder="Select type..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OrderType.WalkIn}>Walk In</SelectItem>
            <SelectItem value={OrderType.Pickup}>Pickup</SelectItem>
            <SelectItem value={OrderType.Delivery}>Delivery</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Clickable customer detail group ── */}
      <button
        type="button"
        onClick={onEditClick}
        className="flex items-center gap-3 rounded-md px-2 py-1 -my-0.5 transition-colors hover:bg-primary/10 cursor-pointer group"
      >
        <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
          <User className="w-3 h-3" />
          <span className="font-medium">
            {context.customerFields.name || "Guest"}
          </span>
        </div>
        {context.customerFields.phone && (
          <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
            <Phone className="w-3 h-3" />
            <span>{context.customerFields.phone}</span>
          </div>
        )}
        {context.customerFields.address && (
          <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
            <MapPin className="w-3 h-3" />
            <span className="truncate max-w-40">
              {context.customerFields.address}
            </span>
          </div>
        )}
        <UserPlus className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </button>

      {/* ── Custom content/action/filter bar ── */}
      {children}

      {context.estimatedTimeLabel && (
        <div className="ml-auto flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{context.estimatedTimeLabel}</span>
        </div>
      )}
    </div>
  );
}