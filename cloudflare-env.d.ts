declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    LOGO_VISION_API_KEY?: string;
    ADMIN_USER_IDS?: string;
    LEAD_COLLECTION_ENABLED?: string;
    ANALYTICS_ENABLED?: string;
    LEAD_RETENTION_DAYS?: string;
    ANALYTICS_RETENTION_DAYS?: string;
    BUCKET?: R2Bucket;
  }
}
