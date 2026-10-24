import type { Options } from "react-markdown";

export type RehypePlugins = NonNullable<Options["rehypePlugins"]>;

// Plugin highlight (rehype-highlight + highlight.js + definisi bahasa) cukup
// berat dan cuma dibutuhin kalau ada code block, jadi di-load lazy sebagai
// chunk terpisah -- gak ikut nambah ukuran halaman chat di load awal.
let loaded: RehypePlugins | null = null;
let pending: Promise<RehypePlugins> | null = null;

// Sinkron: dipake sebagai nilai awal state, jadi bubble yang di-mount ulang
// (mis. pas di-scroll balik oleh virtualizer) langsung ke-highlight tanpa
// kedip polos dulu.
export function getLoadedHighlightPlugins() {
  return loaded;
}

export function loadHighlightPlugins(): Promise<RehypePlugins> {
  pending ??= import("@/lib/highlight-plugin")
    .then((m) => (loaded = m.highlightPlugins))
    .catch((err) => {
      pending = null; // biar bisa dicoba lagi lain kali
      throw err;
    });
  return pending;
}
