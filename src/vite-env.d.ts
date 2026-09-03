/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Cloudflare Turnstile site key（未配置时登录页不渲染人机验证） */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
