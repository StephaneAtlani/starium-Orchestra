export type UserSummary = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
};

type UserLike = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export function toUserSummary(user: UserLike): UserSummary {
  const parts = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const displayName = parts.length > 0 ? parts : user.email;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName,
  };
}
