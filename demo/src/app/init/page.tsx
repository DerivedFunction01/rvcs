"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useVCSStore } from "@/store/vcs-store";
import { OrderInitScreen } from "@/components/pos/screens/order-init-screen";
import { toast } from "sonner";

export default function InitPage() {
  const { isInitialized, initRepo, loadCatalog, catalogLoaded, hydrate } = useVCSStore();
  const router = useRouter();

  const [storeLabel, setStoreLabel] = useState("Main Location");
  const [defaultPaymentFromConfig, setDefaultPaymentFromConfig] = useState("cash");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isInitialized) {
      router.push("/");
    }
  }, [isInitialized, router]);

  useEffect(() => {
    if (!catalogLoaded) {
      fetch("/api/catalog")
        .then((r) => r.json())
        .then((data) => {
          if (data.catalog) loadCatalog(data.catalog);
        })
        .catch(console.error);
    }
  }, [catalogLoaded, loadCatalog]);

  useEffect(() => {
    fetch("/api/pos-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.label) setStoreLabel(data.label);
        if (data.defaultPaymentMethod)
          setDefaultPaymentFromConfig(
            data.defaultPaymentMethod.toLowerCase(),
          );
      })
      .catch(() => {});
  }, []);

  const handleOrderStart = useCallback(
    (context: Parameters<typeof initRepo>[0]) => {
      initRepo(context, defaultPaymentFromConfig);
      toast.success(
        `${context.orderTypeLabel} order started for ${
          context.customerFields.name || "customer"
        } on ${context.serverName}`,
      );
      router.push("/");
    },
    [initRepo, defaultPaymentFromConfig, router],
  );

  if (isInitialized) {
    return null;
  }

  return (
    <OrderInitScreen
      onOrderStart={handleOrderStart}
      storeLabel={storeLabel}
    />
  );
}
