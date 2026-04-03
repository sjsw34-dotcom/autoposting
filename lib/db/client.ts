import { sql } from '@vercel/postgres';

export { sql };

export async function query(text: string, params?: unknown[]) {
  return sql.query(text, params);
}
