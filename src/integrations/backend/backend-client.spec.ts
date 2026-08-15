import { describe, expect, it, vi } from "vitest";
import { BackendClient, BackendRequestError } from "./backend-client.js";

const secret = "integration-secret-at-least-thirty-two-characters";

describe("BackendClient", () => {
  it("exchanges the one-time token without sending the integration secret", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ linked: true, connectionId: "connection-id" }),
      );
    const client = new BackendClient(
      "https://api.example.test",
      secret,
      fetcher,
    );

    await expect(
      client.exchangeTelegramLink({
        token: "opaque",
        telegramUserId: "123",
        chatId: "123",
      }),
    ).resolves.toEqual({ linked: true, connectionId: "connection-id" });

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://api.example.test/api/v1/telegram/link/exchange",
    );
    expect(init?.headers).toEqual({ "content-type": "application/json" });
  });

  it("authenticates and URL-encodes integration status requests", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        status: "ACTIVE",
        linkedAt: "2026-08-15T00:00:00Z",
        revokedAt: null,
      }),
    );
    const client = new BackendClient(
      "https://api.example.test",
      secret,
      fetcher,
    );

    await expect(client.status("123+456")).resolves.toMatchObject({
      status: "ACTIVE",
    });

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(String(url)).toContain("telegramUserId=123%2B456");
    expect(init?.headers).toEqual({ "x-telegram-integration-secret": secret });
  });

  it("does not report unlink success for an authorization error", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const client = new BackendClient(
      "https://api.example.test",
      secret,
      fetcher,
    );

    await expect(client.unlink("123")).rejects.toEqual(
      expect.objectContaining<Partial<BackendRequestError>>({ status: 401 }),
    );
  });

  it("returns null when a connection does not exist", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 404 }));
    const client = new BackendClient(
      "https://api.example.test",
      secret,
      fetcher,
    );

    await expect(client.status("123")).resolves.toBeNull();
  });
});
