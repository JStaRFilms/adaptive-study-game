import { getDatabasePool } from './database';

function configuredLimit(name: string): number {
  const value = process.env[name];
  if (!value || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return Number(value);
}

// Charge on admission, including provider failures. This prevents repeated failing calls
// from exhausting the provider budget without consuming the account's allowance.
export async function admitAiRequest(userId: string, units: number): Promise<boolean> {
  const userLimit = configuredLimit('AI_DAILY_USER_UNITS');
  const globalLimit = configuredLimit('AI_DAILY_GLOBAL_UNITS');
  if (!Number.isSafeInteger(units) || units < 1 || units > userLimit || units > globalLimit) return false;

  const client = await getDatabasePool().connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);
    for (const [scope, id] of [['global', ''], ['user', userId]]) {
      await client.query(`INSERT INTO ai_daily_usage (scope, user_id, day, units)
        VALUES ($1, $2, (now() AT TIME ZONE 'UTC')::date, 0)
        ON CONFLICT (scope, user_id, day) DO NOTHING`, [scope, id]);
    }
    // Lock the global row first for every request so concurrent admissions serialize.
    const global = await client.query<{ units: number }>(`SELECT units FROM ai_daily_usage
      WHERE scope = 'global' AND user_id = '' AND day = (now() AT TIME ZONE 'UTC')::date FOR UPDATE`);
    const user = await client.query<{ units: number }>(`SELECT units FROM ai_daily_usage
      WHERE scope = 'user' AND user_id = $1 AND day = (now() AT TIME ZONE 'UTC')::date FOR UPDATE`, [userId]);
    if (!global.rows[0] || !user.rows[0]) throw new Error('Usage rows are unavailable.');
    if (global.rows[0].units + units > globalLimit || user.rows[0].units + units > userLimit) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query(`UPDATE ai_daily_usage SET units = units + $1
      WHERE scope = 'global' AND user_id = '' AND day = (now() AT TIME ZONE 'UTC')::date`, [units]);
    await client.query(`UPDATE ai_daily_usage SET units = units + $1
      WHERE scope = 'user' AND user_id = $2 AND day = (now() AT TIME ZONE 'UTC')::date`, [units, userId]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
