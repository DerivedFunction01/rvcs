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
import { MapPin, Phone, Settings2, User } from "lucide-react";
import { useEffect, useState } from "react";

interface CustomerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderType: OrderType | undefined;
  customerFields: Record<string, string>;
  onSave: (fields: Record<string, string>) => void;
}

export function CustomerEditDialog({
  open,
  onOpenChange,
  orderType,
  customerFields,
  onSave,
}: CustomerEditDialogProps) {
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setEditedFields({ ...customerFields });
      setErrors({});
    }
  }, [open, customerFields]);

  const handleSave = () => {
    const nextErrors: Record<string, string> = {};
    const name = (editedFields.name || "").trim();
    const phone = (editedFields.phone || "").trim();
    const address = (editedFields.address || "").trim();

    const isPickup = orderType === OrderType.Pickup;
    const isDelivery = orderType === OrderType.Delivery;

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

    onSave(editedFields);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Edit Customer Info
          </DialogTitle>
          <DialogDescription>
            Update the customer details for this order. Changes apply
            immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          {/* Column 1 */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <User className="w-3 h-3" /> Name <span className="text-destructive text-xs">*</span>
              </label>
              <Input
                value={editedFields.name ?? ""}
                onChange={(e) => setEditedFields(prev => ({ ...prev, name: e.target.value }))}
                className={`h-9 text-sm ${errors.name ? "border-destructive" : ""}`}
              />
              {errors.name && <p className="text-xs text-destructive font-medium">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> Phone
              </label>
              <Input
                type="tel"
                value={editedFields.phone ?? ""}
                onChange={(e) => setEditedFields(prev => ({ ...prev, phone: e.target.value }))}
                className="h-9 text-sm"
                placeholder="123-456-7890"
              />
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            {orderType === OrderType.Delivery && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Delivery Address
                </label>
                <Input
                  value={editedFields.address ?? ""}
                  onChange={(e) => setEditedFields(prev => ({ ...prev, address: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Settings2 className="w-3 h-3" /> Order Notes
              </label>
              <Textarea
                value={editedFields.notes ?? ""}
                onChange={(e) => setEditedFields(prev => ({ ...prev, notes: e.target.value }))}
                className="text-sm resize-none"
                // Adjusted rows for better fit in column
                rows={orderType === OrderType.Delivery ? 3 : 5}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            <User className="w-3.5 h-3.5 mr-1.5" /> Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
