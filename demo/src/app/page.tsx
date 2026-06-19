"use client";

import { OrderInitScreen } from "@/components/pos/screens/order-init-screen";
import { POSTerminalScreen } from "@/components/pos/screens/pos-terminal";
import { useVCSStore } from "@/store/vcs-store";
import React, { useCallback } from "react";
import { type FloorConfig, type OrderTypeConfig } from "@/lib/pos/types";
import { toast } from "sonner";

export default function POSTerminal() {
  const { isInitialized, initRepo, loadCatalog, catalogLoaded, hydrate } =
    useVCSStore();

  const [storeLabel, setStoreLabel] = React.useState("Main Location");
  const [defaultPaymentFromConfig, setDefaultPaymentFromConfig] =
    React.useState("cash");
  const [orderTypes, setOrderTypes] = React.useState<OrderTypeConfig[]>([]);
  const [floorConfigs, setFloorConfigs] = React.useState<FloorConfig[]>([]);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (!catalogLoaded) {
      fetch("/api/catalog")
        .then((r) => r.json())
        .then((data) => {
          if (data.catalog) loadCatalog(data.catalog);
        })
        .catch(console.error);
    }
  }, [catalogLoaded, loadCatalog]);

  React.useEffect(() => {
    fetch("/api/pos-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.label) setStoreLabel(data.label);
        if (data.defaultPaymentMethod)
          setDefaultPaymentFromConfig(
            data.defaultPaymentMethod.toLowerCase(),
          );
        if (data.orderTypes) setOrderTypes(data.orderTypes);
        if (data.floorConfigs) setFloorConfigs(data.floorConfigs);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    fetch("/api/icon-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.configs) useVCSStore.getState().loadIconConfigs(data.configs);
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
    },
    [initRepo, defaultPaymentFromConfig],
  );

  if (!isInitialized)
    return (
      <OrderInitScreen
        onOrderStart={handleOrderStart}
        storeLabel={storeLabel}
      />
    );

  const currentBranchName = useVCSStore.getState().activeBranch();
  const viewingHash = useVCSStore.getState().viewingHash;

  return (
    <POSTerminalScreen
      key={`${currentBranchName}-${viewingHash || "head"}`}
      floorConfigs={floorConfigs}
      orderTypes={orderTypes}
    />
  );
}
