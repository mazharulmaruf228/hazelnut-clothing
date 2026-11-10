import { Suspense } from "react";
import { Footer, Header, HeaderFallback } from "@/components/store/header";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="fixed left-5 top-[-100px] z-[100] bg-white p-3 focus:top-[10px]">
        Skip to content
      </a>
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
