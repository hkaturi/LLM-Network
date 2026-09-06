import { isDispatcherEmail } from "@workspace/dispatcher-config";

type UserWithPrimaryEmail = {
  primaryEmailAddress?: { emailAddress?: string | null } | null;
};

export function isDispatcherUser(user: UserWithPrimaryEmail | null | undefined): boolean {
  return isDispatcherEmail(user?.primaryEmailAddress?.emailAddress);
}
