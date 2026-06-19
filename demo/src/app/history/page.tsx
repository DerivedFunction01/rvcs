"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVCSStore } from "@/store/vcs-store";
import { OrderHistoryScreen } from "@/components/pos/screens/order-history-screen";

export default function HistoryPage() {
  const { isInitialized, hydrate } = useVCSStore();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isInitialized) {
      router.push("/");
    }
  }, [isInitialized, router]);

  if (!isInitialized) {
    return null;
  }

  return <OrderHistoryScreen />;
}
