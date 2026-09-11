import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

// Satu kolom, rata kiri, tanpa card/shadow/split-panel brand -- form
// diperlakukan kayak dokumen yang diisi, bukan widget di dalam kartu.
// Satu-satunya animasi: kursor terminal yang blink di sebelah wordmark,
// nyambung langsung ke sifat produknya (AI chat), bukan stagger fade-in.
function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const scope = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduceMotion) return;

      gsap.to("[data-cursor]", {
        opacity: 0,
        duration: 0.6,
        repeat: -1,
        yoyo: true,
        ease: "steps(1)",
      });
    },
    { scope },
  );

  return (
    <div
      ref={scope}
      className="flex min-h-svh w-full flex-col justify-center bg-background px-6 py-12 sm:px-10"
    >
      <div className="mx-auto w-full max-w-[380px]">
        <div className="mb-10 font-mono text-sm text-muted-foreground">
          aisan
          <span data-cursor className="text-primary">
            _
          </span>
        </div>

        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>

        <div className="mt-8 border-t border-border pt-8">{children}</div>

        <div className="mt-8 text-sm text-muted-foreground">{footer}</div>
      </div>
    </div>
  );
}

export { AuthLayout };
