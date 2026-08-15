import { describe, expect, it } from "vitest";
import { parseStartPayload } from "./start-payload.js";

describe("parseStartPayload", () => {
  it("accepts an opaque linking token", () => {
    expect(parseStartPayload("/start abcdefghijklmnop_123")).toBe(
      "abcdefghijklmnop_123",
    );
  });

  it("supports commands addressed to the bot", () => {
    expect(parseStartPayload("/start@my_love_bot abcdefghijklmnop")).toBe(
      "abcdefghijklmnop",
    );
  });

  it.each(["/start", "/start short", "/start unsafe.token", undefined])(
    "rejects a missing or malformed token: %s",
    (value) => expect(parseStartPayload(value)).toBeNull(),
  );
});
