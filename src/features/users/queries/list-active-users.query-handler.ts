import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import type {
  ActiveUsersQuery as ActiveUsersQueryPayload,
  ActiveUsersResponse,
} from '../contracts/users.contracts';

interface ActiveUserRow {
  id: string | null;
  login: string | null;
  age: number | null;
  description: string | null;
  avatar_id: string | null;
  avatar_file_name: string | null;
  avatar_mime_type: 'image/jpeg' | 'image/png' | null;
  avatar_size: number | null;
  avatar_created_at: Date | null;
  total: string;
}

export class ListActiveUsersQuery {
  constructor(public readonly payload: ActiveUsersQueryPayload) {}
}

@QueryHandler(ListActiveUsersQuery)
export class ListActiveUsersHandler
  implements IQueryHandler<ListActiveUsersQuery, ActiveUsersResponse>
{
  constructor(private readonly dataSource: DataSource) {}

  async execute(query: ListActiveUsersQuery): Promise<ActiveUsersResponse> {
    const { minAge, maxAge, page, limit } = query.payload;
    const offset = (page - 1) * limit;
    const rows = await this.dataSource.query<ActiveUserRow[]>(
      `
        WITH qualifying_users AS (
          SELECT
            u.id,
            u.login,
            u.age,
            u.description,
            u.created_at AS user_created_at,
            latest_avatar.id AS avatar_id,
            latest_avatar.file_name AS avatar_file_name,
            latest_avatar.mime_type AS avatar_mime_type,
            latest_avatar.size AS avatar_size,
            latest_avatar.created_at AS avatar_created_at
          FROM users u
          JOIN LATERAL (
            SELECT a.id, a.file_name, a.mime_type, a.size, a.created_at
            FROM avatars a
            WHERE a.user_id = u.id AND a.deleted_at IS NULL
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT 1
          ) latest_avatar ON TRUE
          WHERE u.deleted_at IS NULL
            AND BTRIM(u.description) <> ''
            AND u.age BETWEEN $1 AND $2
            AND (
              SELECT COUNT(*)
              FROM avatars active_avatar
              WHERE active_avatar.user_id = u.id
                AND active_avatar.deleted_at IS NULL
            ) > 2
        ),
        paged_users AS (
          SELECT *
          FROM qualifying_users
          ORDER BY user_created_at DESC, id DESC
          LIMIT $3 OFFSET $4
        ),
        total AS (
          SELECT COUNT(*) AS value FROM qualifying_users
        )
        SELECT paged_users.*, total.value AS total
        FROM total
        LEFT JOIN paged_users ON TRUE
        ORDER BY paged_users.user_created_at DESC, paged_users.id DESC
      `,
      [minAge, maxAge, limit, offset],
    );
    const total = Number(rows[0]?.total ?? 0);
    const pageRows = rows.filter(
      (row): row is ActiveUserRow & {
        id: string;
        login: string;
        age: number;
        description: string;
        avatar_id: string;
        avatar_file_name: string;
        avatar_mime_type: 'image/jpeg' | 'image/png';
        avatar_size: number;
        avatar_created_at: Date;
      } => row.id !== null,
    );

    return {
      items: pageRows.map((row) => ({
        id: row.id,
        login: row.login,
        age: row.age,
        description: row.description,
        latestAvatar: {
          id: row.avatar_id,
          fileName: row.avatar_file_name,
          mimeType: row.avatar_mime_type,
          size: row.avatar_size,
          createdAt: row.avatar_created_at,
        },
      })),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }
}
