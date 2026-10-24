import rehypeHighlight from "rehype-highlight";
import bash from "highlight.js/lib/languages/bash";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import dart from "highlight.js/lib/languages/dart";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import ini from "highlight.js/lib/languages/ini";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

import type { RehypePlugins } from "@/lib/highlight";

// Cuma bahasa yang beneran sering muncul (sesuai stack: Go, TS/JS, PHP,
// Dart, C#, ...) -- BUKAN seluruh highlight.js, biar chunk-nya kecil.
// Alias bawaan tiap bahasa (ts, tsx, js, jsx, sh, html, yml, cs, py, md, ...)
// ikut kedaftar otomatis; di bawah ini cuma tambahan.
// Tambah bahasa baru: import di atas + masukin ke `languages`.
export const highlightPlugins: RehypePlugins = [
  [
    rehypeHighlight,
    {
      // Code block tanpa label bahasa dibiarin polos (gak ditebak-tebak):
      // menebak itu mahal dan sering salah warna.
      detect: false,
      languages: {
        bash,
        csharp,
        css,
        dart,
        diff,
        go,
        ini,
        javascript,
        json,
        markdown,
        php,
        python,
        sql,
        typescript,
        xml,
        yaml,
      },
      aliases: {
        bash: ["shell", "console"],
        ini: ["env", "dotenv"],
        xml: ["vue"],
        sql: ["mysql", "postgres", "postgresql", "pgsql"],
      },
    },
  ],
];
