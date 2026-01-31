/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAYSTACK_PUBLIC_KEY: string;
  readonly VITE_PAYSTACK_SECRET_KEY: string;
  readonly VITE_HUBTEL_CLIENT_ID: string;
  readonly VITE_HUBTEL_CLIENT_SECRET: string;
  readonly VITE_VTPASS_API_KEY: string;
  readonly VITE_VTPASS_EMAIL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}