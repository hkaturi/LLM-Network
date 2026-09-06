export const DISPATCHER_EMAIL = "hari_babu29@yahoo.com";
export const DISPATCHER_ACCOUNT_SETUP_MESSAGE =
  "The authorized dispatcher email must first be provisioned in the project's Replit-managed Auth tools before sign-in or password reset can work. Ask a project administrator to provision the account; dispatcher self-signup is not available.";

export function isDispatcherEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === DISPATCHER_EMAIL;
}