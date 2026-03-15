type AvatarUser = {
  name?: string | null;
  image?: string | null;
  avatar?: string | null;
};

export function createFallbackAvatarUrl(name?: string | null) {
  const safeName = name?.trim() || "MeetFlow User";

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&background=1a73e8&color=fff&size=256`;
}

export function resolveAvatar(user?: AvatarUser | null) {
  if (!user) {
    return createFallbackAvatarUrl();
  }

  return user.avatar ?? user.image ?? createFallbackAvatarUrl(user.name);
}

export function getInitials(name?: string | null) {
  if (!name) {
    return "MF";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "MF";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
