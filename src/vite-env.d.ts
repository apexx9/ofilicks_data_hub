/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAYSTACK_PUBLIC_KEY: string;
  readonly VITE_PAYSTACK_SECRET_KEY: string;
  readonly VITE_HUBTEL_CLIENT_ID: string;
  readonly VITE_HUBTEL_CLIENT_SECRET: string;
  readonly VITE_VTPASS_API_KEY: string;
  readonly VITE_VTPASS_EMAIL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}