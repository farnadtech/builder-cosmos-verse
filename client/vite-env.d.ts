/// <reference types="vite/client" />

declare global {
  interface Window {
    authenticatedFetch?: (
      url: string,
      options?: RequestInit,
    ) => Promise<Response>;
  }
}

export {};
