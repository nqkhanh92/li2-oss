import { validateUrl } from "@/shared/lib/utils";
import { vi, describe, it, expect, beforeAll } from "vitest";

const testLinks = [
  // ✅ Domains allowed
  { url: "http://example.com", valid: true },
  { url: "http://sub.example.com", valid: true },
  { url: "http://sub.example.com/abc?query=123", valid: true },

  // ✅ Valid IPv4 links
  { url: "http://1.1.1.1", valid: true },
  { url: "http://8.8.8.8:8080/path", valid: true },
  { url: "https://104.26.3.2/index.html", valid: true },
  { url: "http://93.184.216.34?query=123", valid: true },

  // ✅ Private or reserved IPv4 — now allowed
  { url: "http://10.0.0.1", valid: true },
  { url: "http://172.16.0.1", valid: true },
  { url: "http://192.168.1.1", valid: true },
  { url: "http://127.0.0.1", valid: true },
  { url: "http://169.254.1.1", valid: true },
  { url: "http://255.255.255.255", valid: true },
  { url: "8.8.8.8", valid: true },

  // ❌ Block malformed/invalid
  { url: "https://11111", valid: false },
  { url: "https://abcxyz", valid: false },
];

describe("Validate URL", () => {
  testLinks.forEach((link) => {
    it(`should return ${link.valid} for ${link.url}`, () => {
      expect(validateUrl(link.url)).toBe(link.valid);
    });
  });
});
