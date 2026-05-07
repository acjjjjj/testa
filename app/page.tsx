import { AppShell } from "@/components/AppShell";
import { DemoStoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/Toast";

export default function Page() {
  return (
    <ToastProvider>
      <DemoStoreProvider>
        <AppShell />
      </DemoStoreProvider>
    </ToastProvider>
  );
}
