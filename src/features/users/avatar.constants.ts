export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

export type AvatarMimeType = (typeof AVATAR_MIME_TYPES)[number];
