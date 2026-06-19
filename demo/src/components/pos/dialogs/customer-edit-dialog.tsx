import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OrderType } from "@/lib/pos/types";
import { MapPin, Phone, Settings2, User, Clock, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

interface CustomerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderType: OrderType | undefined;
  customerFields: Record<string, string>;
  onSave: (fields: Record<string, string>, orderType: OrderType) => void;
}

export function CustomerEditDialog({
  open,
  onOpenChange,
  orderType: initialOrderType,
  customerFields,
  onSave,
}: CustomerEditDialogProps) {
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType>(
    initialOrderType || OrderType.WalkIn
  );
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setEditedFields({ ...customerFields });
      setSelectedOrderType(initialOrderType || OrderType.WalkIn);
      setErrors({});
    }
  }, [open, customerFields, initialOrderType]);

  const handleSave = () => {
    const nextErrors: Record<string, string> = {};
    const name = (editedFields.name || "").trim();
    const phone = (editedFields.phone || "").trim();
    const address = (editedFields.address || "").trim();

    const isPickup = selectedOrderType === OrderType.Pickup;
    const isDelivery = selectedOrderType === OrderType.Delivery;

    if (!name) {
      nextErrors.name = "Name is required";
    } else if (name.length < 2) {
      nextErrors.name = "Minimum 2 characters";
    }

    if (isPickup || isDelivery) {
      if (!phone) {
        nextErrors.phone = "Phone Number is required";
      } else if (phone.length < 3) {
        nextErrors.phone = "Minimum 3 characters";
      }
    }

    if (isDelivery) {
      if (!address) {
        nextErrors.address = "Delivery Address is required";
      } else if (address.length < 5) {
        nextErrors.address = "Minimum 5 characters";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave(editedFields, selectedOrderType);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl p-6 md:p-8">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-lg md:text-2xl">
            <User className="w-4 h-4 md:w-6 md:h-6 text-primary" /> Edit Customer & Order Info
          </DialogTitle>
          <DialogDescription className="md:text-base">
            Update the customer details and fulfillment type for this order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Order/Fulfillment Type Selection */}
          <div className="space-y-2">
            <label className="text-xs md:text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" /> Order Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: OrderType.WalkIn, label: "Walk In", icon: User },
                { value: OrderType.Pickup, label: "Pickup", icon: Clock },
                { value: OrderType.Delivery, label: "Delivery", icon: MapPin },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = selectedOrderType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedOrderType(opt.value);
                      setErrors({});
                    }}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm md:text-base font-semibold transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.01]"
                        : "bg-card hover:bg-accent/50 border-border"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {/* Column 1 */}
            <div className="space-y-4 md:space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3 h-3 md:w-4 md:h-4" /> Name <span className="text-destructive text-xs md:text-sm">*</span>
                </label>
                <Input
                  value={editedFields.name ?? ""}
                  onChange={(e) => setEditedFields(prev => ({ ...prev, name: e.target.value }))}
                  className={`h-9 md:h-12 text-sm md:text-base ${errors.name ? "border-destructive" : ""}`}
                />
                {errors.name && <p className="text-xs md:text-sm text-destructive font-medium">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3 h-3 md:w-4 md:h-4" /> Phone {(selectedOrderType === OrderType.Pickup || selectedOrderType === OrderType.Delivery) && <span className="text-destructive text-xs md:text-sm">*</span>}
                </label>
                <Input
                  type="tel"
                  value={editedFields.phone ?? ""}
                  onChange={(e) => setEditedFields(prev => ({ ...prev, phone: e.target.value }))}
                  className={`h-9 md:h-12 text-sm md:text-base ${errors.phone ? "border-destructive" : ""}`}
                  placeholder="123-456-7890"
                />
                {errors.phone && <p className="text-xs md:text-sm text-destructive font-medium">{errors.phone}</p>}
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4 md:space-y-6">
              {selectedOrderType === OrderType.Delivery ? (
                <div className="space-y-1.5">
                  <label className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 md:w-4 md:h-4" /> Delivery Address <span className="text-destructive text-xs md:text-sm">*</span>
                  </label>
                  <Input
                    value={editedFields.address ?? ""}
                    onChange={(e) => setEditedFields(prev => ({ ...prev, address: e.target.value }))}
                    className={`h-9 md:h-12 text-sm md:text-base ${errors.address ? "border-destructive" : ""}`}
                  />
                  {errors.address && <p className="text-xs md:text-sm text-destructive font-medium">{errors.address}</p>}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Settings2 className="w-3 h-3 md:w-4 md:h-4" /> Order Notes
                </label>
                <Textarea
                  value={editedFields.notes ?? ""}
                  onChange={(e) => setEditedFields(prev => ({ ...prev, notes: e.target.value }))}
                  className="text-sm md:text-base resize-none p-3"
                  rows={selectedOrderType === OrderType.Delivery ? 3 : 6}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-3 flex-row justify-end mt-2">
          <Button
            variant="outline"
            className="h-9 md:h-12 lg:h-16 text-sm md:text-base lg:text-lg px-4 md:px-6"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="h-9 md:h-12 lg:h-16 text-sm md:text-base lg:text-lg px-4 md:px-6"
            onClick={handleSave}
          >
            <User className="w-3.5 h-3.5 md:w-5 md:h-5 mr-1.5 md:mr-2" /> Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}