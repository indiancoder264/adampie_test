
import getPool from './db';
import { headers } from 'next/headers';

type RateLimitConfig = {
  limit: number;
  window: number; // in seconds
};

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  login_attempt: { limit: 10, window: 60 * 5 }, // 10 requests per 5 minutes
  signup_attempt: { limit: 5, window: 60 * 60 }, // 5 requests per hour
  otp_request: { limit: 5, window: 60 * 10 }, // 5 requests per 10 minutes
};

async function getIpAddress(): Promise<string | null> {
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = headersList.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return null;
}

export async function checkRateLimit(actionType: keyof typeof rateLimitConfigs) {
  const ip = await getIpAddress();
  if (!ip) {
    // If we can't get an IP, we can't rate limit.
    // In a production environment, you should ensure your proxy setup (e.g., Vercel) correctly sets these headers.
    // For now, we'll allow the request to proceed but log a warning.
    console.warn(`Could not determine IP address for rate limiting action: ${actionType}.`);
    return;
  }

  const config = rateLimitConfigs[actionType];
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Atomically get count and add new entry
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT COUNT(*) FROM rate_limits WHERE ip_address = $1 AND action_type = $2 AND created_at > NOW() - INTERVAL '${config.window} seconds'`,
      [ip, actionType]
    );

    const requestCount = parseInt(result.rows[0].count, 10);

    if (requestCount >= config.limit) {
      throw new Error(`Rate limit exceeded for ${actionType}. Please try again later.`);
    }

    await client.query(
      'INSERT INTO rate_limits (ip_address, action_type) VALUES ($1, $2)',
      [ip, actionType]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error; // Re-throw the original error (e.g., the rate limit exceeded error)
  } finally {
    client.release();
  }
}
