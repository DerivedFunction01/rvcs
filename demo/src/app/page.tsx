"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { POSTerminalScreen } from "@/components/pos/screens/pos-terminal";
import { useVCSStore } from "@/store/vcs-store";
import { type FloorConfig, type OrderTypeConfig } from "@/lib/pos/types";

export default function POSTerminal() {
  const { isInitialized, loadCatalog, catalogLoaded, hydrate } = useVCSStore();
  const router = useRouter();

  const [orderTypes, setOrderTypes] = React.useState<OrderTypeConfig[]>([]);
  const [floorConfigs, setFloorConfigs] = React.useState<FloorConfig[]>([]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isInitialized) {
      router.push("/init");
    }
  }, [isInitialized, router]);

  useEffect(() => {
    if (isInitialized && !catalogLoaded) {
      fetch("/api/catalog")
        .then((r) => r.json())
        .then((data) => {
          if (data.catalog) loadCatalog(data.catalog);
        })
        .catch(console.error);
    }
  }, [isInitialized, catalogLoaded, loadCatalog]);

  useEffect(() => {
    if (isInitialized) {
      fetch("/api/pos-config")
        .then((r) => r.json())
        .then((data) => {
          if (data.orderTypes) setOrderTypes(data.orderTypes);
          if (data.floorConfigs) setFloorConfigs(data.floorConfigs);
        })
        .catch(() => {});
    }
  }, [isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      fetch("/api/icon-config")
        .then((r) => r.json())
        .then((data) => {
          if (data.configs) useVCSStore.getState().loadIconConfigs(data.configs);
        })
        .catch(() => {});
    }
  }, [isInitialized]);

  if (!isInitialized) {
    return null;
  }

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
