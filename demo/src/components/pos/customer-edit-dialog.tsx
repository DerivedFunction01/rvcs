import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, Phone, MapPin, Settings2 } from "lucide-react";

interface CustomerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderType: string | undefined;
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

    const isPickup = orderType === "pickup";
    const isDelivery = orderType === "delivery";

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Edit Customer Info
          </DialogTitle>
          <DialogDescription>
            Update the customer details for this order. Changes apply immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <User className="w-3 h-3" /> Name <span className="text-destructive text-xs">*</span>
            </label>
            <Input
              id="customer-name"
              placeholder="e.g. John Smith"
              value={editedFields.name ?? ""}
              onChange={(e) => {
                setEditedFields((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.name;
                    return next;
                  });
                }
              }}
              className={`h-9 text-sm ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
              autoComplete="name"
            />
            {errors.name && (
              <p className="text-xs text-destructive font-medium">{errors.name}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> Phone {(orderType === "pickup" || orderType === "delivery") && <span className="text-destructive text-xs">*</span>}
            </label>
            <Input
              id="customer-phone"
              type="tel"
              placeholder="e.g. (555) 123-4567"
              value={editedFields.phone ?? ""}
              onChange={(e) => {
                setEditedFields((prev) => ({ ...prev, phone: e.target.value }));
                if (errors.phone) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.phone;
                    return next;
                  });
                }
              }}
              className={`h-9 text-sm ${errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
              autoComplete="tel"
                />
            {errors.phone && (
              <p className="text-xs text-destructive font-medium">{errors.phone}</p>
            )}
          </div>
          {orderType === "delivery" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Delivery Address <span className="text-destructive text-xs">*</span>
              </label>
              <Input
                id="customer-address"
                placeholder="e.g. 123 Main St, City, State"
                value={editedFields.address ?? ""}
                onChange={(e) => {
                  setEditedFields((prev) => ({ ...prev, address: e.target.value }));
                  if (errors.address) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.address;
                      return next;
                    });
                  }
                }}
                className={`h-9 text-sm ${errors.address ? "border-destructive focus-visible:ring-destructive" : ""}`}
                autoComplete="street-address"
              />
              {errors.address && (
                <p className="text-xs text-destructive font-medium">{errors.address}</p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Settings2 className="w-3 h-3" /> Order Notes
            </label>
            <Textarea
              id="customer-notes"
              placeholder="Allergies, special requests, etc."
              value={editedFields.notes ?? ""}
              onChange={(e) =>
                setEditedFields((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="text-sm resize-none"
              rows={3}
            />
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
