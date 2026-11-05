import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = fileURLToPath(new URL(".", import.meta.url));
const files = (folder: string) => readdirSync(join(source, folder)).filter((name) => name.endsWith(".ts"));
const text = (folder: string, file: string) => readFileSync(join(source, folder, file), "utf8");
const imports = (content: string) => [...content.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);

describe("backend layer boundaries", () => {
  it("keeps routes declarative and out of services and models", () => {
    for (const file of files("routes")) {
      expect(
        imports(text("routes", file)).filter((value) => /\/(services|models|config|integrations)\//.test(value)),
        file,
      ).toEqual([]);
      expect(text("routes", file), file).not.toMatch(/\basync\b|\bres\.json\b|\breq\.body\b/);
    }
  });
  it("keeps database and provider code out of controllers", () => {
    for (const file of files("controllers")) {
      expect(
        imports(text("controllers", file)).filter((value) => /@prisma|\/models\/|\/integrations\/|\/config\/database/.test(value)),
        file,
      ).toEqual([]);
    }
  });
  it("keeps services independent of Express and HTTP handlers", () => {
    for (const file of files("services")) {
      expect(
        imports(text("services", file)).filter((value) => /express|\/(routes|controllers|middleware)\//.test(value)),
        file,
      ).toEqual([]);
      expect(text("services", file), file).not.toMatch(/\b(req|res)\./);
    }
  });
  it("keeps models independent of HTTP and business layers", () => {
    for (const file of files("models")) {
      expect(
        imports(text("models", file)).filter((value) => /express|\/(routes|controllers|services|middleware)\//.test(value)),
        file,
      ).toEqual([]);
    }
  });
  it("permits the Prisma singleton only in models and lifecycle infrastructure", () => {
    for (const folder of ["services", "controllers", "routes", "middleware", "integrations"]) {
      for (const file of files(folder)) expect(text(folder, file), `${folder}/${file}`).not.toMatch(/import\s*\{[^}]*\bdb\b[^}]*\}/);
    }
  });
});
