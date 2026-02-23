import { describe, it, expect } from "vitest";
import { extToLang, highlight } from "../highlight";

describe("highlight", () => {
  describe("extToLang", () => {
    it("maps .cs extension to csharp language", () => {
      expect(extToLang("cs")).toBe("csharp");
      expect(extToLang(".cs")).toBe("csharp");
      expect(extToLang("CS")).toBe("csharp"); // case insensitive
    });

    it("maps javascript extensions correctly", () => {
      expect(extToLang("js")).toBe("javascript");
      expect(extToLang("jsx")).toBe("javascript");
    });

    it("maps typescript extensions correctly", () => {
      expect(extToLang("ts")).toBe("typescript");
      expect(extToLang("tsx")).toBe("typescript");
    });

    it("returns plaintext for unknown extensions", () => {
      expect(extToLang("unknown")).toBe("plaintext");
      expect(extToLang("xyz")).toBe("plaintext");
    });
  });

  describe("highlight", () => {
    it("highlights C# code correctly", async () => {
      const code = `using System;

class Program 
{
    static void Main() 
    {
        Console.WriteLine("Hello, World!");
    }
}`;
      const html = await highlight(code, "csharp");
      
      // Verify that the HTML contains expected elements
      expect(html).toContain("<pre");
      expect(html).toContain("<code");
      expect(html).toContain("using");
      expect(html).toContain("System");
      expect(html).toContain("class");
      expect(html).toContain("Console");
      expect(html).toContain("WriteLine");
    });

    it("highlights JavaScript code correctly", async () => {
      const code = `function hello() {
  console.log("Hello");
}`;
      const html = await highlight(code, "javascript");
      
      expect(html).toContain("<pre");
      expect(html).toContain("<code");
      expect(html).toContain("function");
      expect(html).toContain("console");
      expect(html).toContain("log");
    });

    it("falls back to plaintext for unknown languages", async () => {
      const code = "some random text";
      const html = await highlight(code, "unknown-lang");
      
      expect(html).toContain("<pre");
      expect(html).toContain("<code");
      expect(html).toContain("some random text");
    });
  });
});
