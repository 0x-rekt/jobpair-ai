const FASTAPI_URL = (process.env.FASTAPI_URL ?? "http://localhost:8000").replace(
  /\/+$/,
  "",
);

export async function fetchFastApi(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const normalizedPath = `/${path.replace(/^\/+/, "")}`;
  const primaryUrl = `${FASTAPI_URL}${normalizedPath}`;
  const response = await fetch(primaryUrl, init);

  if (response.status !== 404) {
    return response;
  }

  const apiUrl = `${FASTAPI_URL}/api${normalizedPath}`;
  if (apiUrl === primaryUrl) {
    return response;
  }

  return fetch(apiUrl, init);
}
