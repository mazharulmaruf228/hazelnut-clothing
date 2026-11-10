"use client";

import { useEffect, useState } from "react";
import { z } from "zod";

const deliveryOptionsSchema = z.object({
  items: z.array(z.object({ district: z.string(), deliveryCharge: z.string() })),
});

export type DeliveryOption = z.infer<typeof deliveryOptionsSchema>["items"][number];

export function useDeliveryOptions() {
  const [items, setItems] = useState<DeliveryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/orders/delivery-options")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load Bangladesh delivery districts.");
        const result = deliveryOptionsSchema.safeParse(await response.json());
        if (!result.success) throw new Error("The delivery options response was invalid.");
        if (active) setItems(result.data.items);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load delivery options.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { items, isLoading, error };
}
