"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Mail, MapPin, Phone, Search, User } from "lucide-react";
import React, { useEffect, useState } from "react";

interface CustomerProfile {
  id: string;
  loyaltyTier: string;
  names: Array<{ displayName: string; firstName: string; lastName: string }>;
  contacts: Array<{ channel: string; value: string; isPrimary: boolean }>;
  deliveryLocations: Array<{ formattedAddress: string; isDefault: boolean }>;
}

interface CustomerSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCustomer: (data: {
    name: string;
    phone: string;
    address: string;
  }) => void;
}

export function CustomerSearchDialog({
  open,
  onOpenChange,
  onSelectCustomer,
}: CustomerSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSearchTerm("");
      fetchCustomers("");
    }
  }, [open]);

  const fetchCustomers = async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.customers) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    fetchCustomers(val);
  };

  const handleSelect = (customer: CustomerProfile) => {
    const displayName = customer.names[0]?.displayName || "";
    const phoneContact =
      customer.contacts.find((c) => c.channel === "phone" && c.isPrimary) ||
      customer.contacts.find((c) => c.channel === "phone") ||
      customer.contacts[0];
    const emailContact = customer.contacts.find((c) => c.channel === "email");
    const defaultLocation =
      customer.deliveryLocations.find((l) => l.isDefault) ||
      customer.deliveryLocations[0];

    onSelectCustomer({
      name: displayName,
      phone: phoneContact?.value || "",
      address: defaultLocation?.formattedAddress || "",
    });
    onOpenChange(false);
  };

  const getTierBadge = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "gold":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none text-[10px]">
            Gold
          </Badge>
        );
      case "silver":
        return (
          <Badge className="bg-slate-400 hover:bg-slate-500 text-white border-none text-[10px]">
            Silver
          </Badge>
        );
      case "bronze":
        return (
          <Badge className="bg-orange-600 hover:bg-orange-700 text-white border-none text-[10px]">
            Bronze
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            Standard
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-2">
          <DialogTitle>Search Customers</DialogTitle>
          <DialogDescription>
            Find existing customer profiles to autofill the order details.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-9 pr-8"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0 max-h-[45vh] -mx-6 px-6">
          <div className="space-y-2">
            {customers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No customers found matching search term.
              </div>
            ) : (
              customers.map((c) => {
                const displayName =
                  c.names[0]?.displayName || "Unknown Customer";
                const phoneContact = c.contacts.find(
                  (con) => con.channel === "phone",
                )?.value;
                const emailContact = c.contacts.find(
                  (con) => con.channel === "email",
                )?.value;
                const defaultAddress =
                  c.deliveryLocations.find((l) => l.isDefault)
                    ?.formattedAddress ||
                  c.deliveryLocations[0]?.formattedAddress;

                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className="w-full flex items-start justify-between rounded-lg border bg-card p-3 text-left transition-all hover:border-primary/50 hover:bg-accent/40"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-semibold text-sm truncate">
                          {displayName}
                        </span>
                        {getTierBadge(c.loyaltyTier)}
                      </div>
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground pl-5">
                        {phoneContact && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 shrink-0" />{" "}
                            {phoneContact}
                          </span>
                        )}
                        {emailContact && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 shrink-0" /> {emailContact}
                          </span>
                        )}
                        {defaultAddress && (
                          <span className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-foreground/80">
                            <MapPin className="w-3 h-3 shrink-0 text-primary" />{" "}
                            {defaultAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
