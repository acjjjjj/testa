import { AppShell } from "@/components/AppShell";
import { DemoStoreProvider } from "@/lib/store";

export default function Page() {
  return (
    <DemoStoreProvider>
      <AppShell />
    </DemoStoreProvider>
  );
}
