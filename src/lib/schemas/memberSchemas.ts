import { z } from "zod";

// Ensure this matches your DB enum exactly.
export const COLLECTIVE_MEMBER_ROLES = [
  "owner",
  "editor",
  "contributor",
  "viewer",
] as const;

export const InviteMemberServerSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  collectiveId: z.string().uuid({ message: "Invalid collective ID." }),
  // Role is required on the server, the form default handles the client-side UX
  role: z.enum(COLLECTIVE_MEMBER_ROLES),
});

export type InviteMemberServerValues = z.infer<typeof InviteMemberServerSchema>;

// Client-side schema can have a default for the form UX
export const InviteMemberClientSchema = InviteMemberServerSchema.extend({
  role: z.enum(COLLECTIVE_MEMBER_ROLES),
});

export type InviteMemberClientFormValues = z.infer<
  typeof InviteMemberClientSchema
>;

// Placeholder for other member-related schemas, e.g., ChangeRoleSchema
