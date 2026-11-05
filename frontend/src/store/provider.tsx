"use client";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { useState } from "react";
import { catalogueApi } from "./api";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() =>
    configureStore({
      reducer: { [catalogueApi.reducerPath]: catalogueApi.reducer },
      middleware: (getDefault) => getDefault().concat(catalogueApi.middleware),
    }),
  );
  return <Provider store={store}>{children}</Provider>;
}
