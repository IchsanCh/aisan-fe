import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

// Satu kolom, rata kiri, tanpa card/shadow/split-panel brand. Momen animasi:
// headline reveal per-kata + underline yang "nggambar" sendiri (analoginya
// AI lagi nulis salam buat kamu -- nyambung ke sifat produk chat-nya),
// bukan sekadar fade-in generik.
function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const scope = React.useRef<HTMLDivElement>(null);
  const words = title.split(" ");

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion) {
        gsap.set("[data-word-inner]", { yPercent: 0 });
        gsap.set("[data-underline]", { scaleX: 1 });
        gsap.set("[data-fade]", { opacity: 1, y: 0 });
        return;
      }

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from("[data-word-inner]", {
          yPercent: 110,
          duration: 0.7,
          stagger: 0.07,
        })
        .from(
          "[data-underline]",
          { scaleX: 0, duration: 0.6, ease: "power2.inOut" },
          "-=0.35",
        )
        .from(
          "[data-fade]",
          { opacity: 0, y: 8, duration: 0.5, stagger: 0.08 },
          "-=0.3",
        );

      // kursor terminal blink, jalan terus selama halaman aktif.
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
      <div className="mx-auto w-full max-w-[420px]">
        <div className="mb-10 font-mono text-sm text-muted-foreground">
          aisan
          <span data-cursor className="text-primary">
            _
          </span>
        </div>

        <h1 className="text-[clamp(2.25rem,6vw,3.25rem)] font-semibold leading-[0.98] tracking-tight text-foreground">
          {words.map((word, i) => (
            <span key={i} className="inline-block overflow-hidden align-top">
              <span data-word-inner className="inline-block">
                {word}
                {i < words.length - 1 ? "\u00A0" : ""}
              </span>
            </span>
          ))}
        </h1>
        <div
          data-underline
          className="mt-3 h-[2px] w-full origin-left bg-primary"
        />

        <p data-fade className="mt-5 text-sm text-muted-foreground">
          {subtitle}
        </p>

        <div data-fade className="mt-8">
          {children}
        </div>

        <div data-fade className="mt-8 text-sm text-muted-foreground">
          {footer}
        </div>
      </div>
    </div>
  );
}

export { AuthLayout };
