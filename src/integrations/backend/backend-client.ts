export class BackendRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "BackendRequestError";
  }
}

export interface TelegramConnectionStatus {
  status: "ACTIVE" | "REVOKED";
  linkedAt: string;
  revokedAt: string | null;
}

export interface TelegramLinkExchangeInput {
  token: string;
  telegramUserId: string;
  chatId: string;
}

export interface TelegramLinkExchangeResult {
  linked: true;
  connectionId: string;
}

export class BackendClient {
  constructor(
    private readonly baseUrl: string,
    private readonly secret: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async status(
    telegramUserId: string,
  ): Promise<TelegramConnectionStatus | null> {
    const response = await this.request(
      this.integrationConnectionUrl(telegramUserId),
      {
        headers: this.integrationHeaders(),
      },
    );

    if (response.status === 404) return null;
    if (!response.ok)
      throw new BackendRequestError(
        "Backend status request failed",
        response.status,
      );

    return (await response.json()) as TelegramConnectionStatus | null;
  }

  async unlink(telegramUserId: string): Promise<void> {
    const response = await this.request(
      this.integrationConnectionUrl(telegramUserId),
      {
        method: "DELETE",
        headers: this.integrationHeaders(),
      },
    );

    if (!response.ok)
      throw new BackendRequestError(
        "Backend unlink request failed",
        response.status,
      );
  }
  async notifications(
    telegramUserId: string,
  ): Promise<Array<{ id: string; title: string; body?: string | null }>> {
    const url = new URL(
      "/api/v1/telegram/integration/notifications",
      this.baseUrl,
    );
    url.searchParams.set("telegramUserId", telegramUserId);
    const response = await this.request(url, {
      headers: this.integrationHeaders(),
    });
    return response.ok
      ? ((await response.json()) as Array<{
          id: string;
          title: string;
          body?: string | null;
        }>)
      : [];
  }

  async exchangeTelegramLink(
    input: TelegramLinkExchangeInput,
  ): Promise<TelegramLinkExchangeResult> {
    const response = await this.request(
      new URL("/api/v1/telegram/link/exchange", this.baseUrl),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new BackendRequestError(
        "Backend link exchange failed",
        response.status,
      );
    }

    return (await response.json()) as TelegramLinkExchangeResult;
  }

  private integrationConnectionUrl(telegramUserId: string): URL {
    const url = new URL(
      "/api/v1/telegram/integration/connection",
      this.baseUrl,
    );
    url.searchParams.set("telegramUserId", telegramUserId);
    return url;
  }

  private integrationHeaders(): HeadersInit {
    return { "x-telegram-integration-secret": this.secret };
  }

  private async request(url: URL, init: RequestInit): Promise<Response> {
    try {
      return await this.fetcher(url, {
        ...init,
        signal: AbortSignal.timeout(8_000),
      });
    } catch (error) {
      throw new BackendRequestError(
        error instanceof Error
          ? `Backend is unavailable: ${error.message}`
          : "Backend is unavailable",
      );
    }
  }
}
