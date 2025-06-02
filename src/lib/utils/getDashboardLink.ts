// src/lib/utils/getDashboardLink.ts

/**
 * Returns the appropriate dashboard path based on user role.
 * @param role The user's role.
 * @returns The dashboard path string.
 */
export function getDashboardLink(role: string | null | undefined): string {
  if (!role) return "/login"; // Default to login if role is unknown or user not logged in
  switch (role) {
    case "Caregiver":
      return "/dashboard/caregiver";
    case "Medical Doctor":
      return "/dashboard/doctor";
    case "Specialist":
      return "/dashboard/specialist";
    default:
      return "/"; // Fallback to homepage or a generic dashboard if role is unrecognized
  }
}
