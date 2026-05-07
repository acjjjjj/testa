import React from "react";
import { createRoot } from "react-dom/client";
import "@/app/globals.css";
import { DemoStoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

const el = document.getElementById("root");
if (!el) throw new Error("#root not found");

createRoot(el).render(
  <React.StrictMode>
    <DemoStoreProvider>
      <AppShell />
    </DemoStoreProvider>
  </React.StrictMode>
);
