declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ADMIN_USER_IDS?: string;
    LEAD_COLLECTION_ENABLED?: string;
    ANALYTICS_ENABLED?: string;
    LEAD_RETENTION_DAYS?: string;
    ANALYTICS_RETENTION_DAYS?: string;
    BUCKET?: R2Bucket;
  }
}
