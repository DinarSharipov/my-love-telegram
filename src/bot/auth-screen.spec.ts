import { describe, expect, it } from "vitest";
import { buildAuthScreen } from "./auth-screen.js";

describe("buildAuthScreen", () => {
  it("links to the Telegram connection settings without exposing credentials", () => {
    const screen = buildAuthScreen("https://my-love.example/app");
    const keyboard = screen.keyboard.inline_keyboard;

    expect(keyboard[0]?.[0]).toMatchObject({
      text: "🔐 Авторизоваться",
      url: "https://my-love.example/profile?connect=telegram",
    });
    expect(screen.text).not.toContain("password");
  });

  it("uses a callback button when Telegram cannot open a local frontend URL", () => {
    const screen = buildAuthScreen("http://localhost:5173");

    expect(screen.keyboard.inline_keyboard[0]?.[0]).toMatchObject({
      text: "🔐 Авторизоваться",
      callback_data: "auth:start",
    });
  });
});
