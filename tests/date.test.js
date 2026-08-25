import { describe, expect, test } from "bun:test";
import { chinaDate } from "../src/date.js";

describe("chinaDate", () => {
  test("uses Asia/Shanghai calendar date", () => {
    expect(chinaDate(new Date("2026-08-24T16:00:00Z"))).toBe("2026-08-25");
    expect(chinaDate(new Date("2026-08-24T15:59:59Z"))).toBe("2026-08-24");
  });
});
