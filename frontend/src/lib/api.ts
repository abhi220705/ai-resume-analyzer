export type Role = "CANDIDATE" | "RECRUITER" | "ADMIN";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type LoginResponse = {
  accessToken: string;
  user: User;
};

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { field: string; message: string }[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is missing.");
  }

  const headers = new Headers(options.headers);

const isFormData =
  typeof FormData !== "undefined" &&
  options.body instanceof FormData;

if (isFormData) {
  headers.delete("Content-Type");
} else if (options.body !== undefined) {
  headers.set("Content-Type", "application/json");
}

  const controller = new AbortController();
 const timeout = setTimeout(
  () => controller.abort(),
  isFormData ? 60000 : 15000,
);

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}${path}`,
      {
        ...options,
        headers,
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      },
    );

    let result: ApiEnvelope<T>;

    try {
      result = (await response.json()) as ApiEnvelope<T>;
    } catch {
      throw new ApiError(
        "The server returned an unexpected response.",
        response.status,
      );
    }

    if (!response.ok || result.success !== true) {
      const details = result.errors
        ?.map((error) => error.message)
        .join(" ");

      throw new ApiError(
        details || result.message || "Request failed.",
        response.status,
      );
    }

    return result.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The request timed out. Please try again.");
    }

    throw new Error(
      "Cannot reach the backend. Check that it is running on port 4000.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = apiRequest<{ accessToken: string | null }>(
      "/api/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    )
      .then((data) => {
        accessToken = data.accessToken;
        return data.accessToken;
      })
      .catch((error: unknown) => {
        accessToken = null;
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function authenticatedRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = accessToken ?? (await refreshAccessToken());
  if (!token) {
    throw new ApiError("Please log in again.", 401);
  }

  function send(currentToken: string) {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${currentToken}`);

    return apiRequest<T>(path, { ...options, headers });
  }

  try {
    return await send(token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) {
      throw error;
    }
    return send(refreshedToken);
  }
}