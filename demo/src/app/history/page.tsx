"use client";

import React, { useEffect } from "react";
import { useVCSStore } from "@/store/vcs-store";
import { OrderHistoryScreen } from "@/components/pos/screens/order-history-screen";

export default function HistoryPage() {
  const { hydrate } = useVCSStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <OrderHistoryScreen />;
}
