"use client";

import React from "react";
import type { MemberWithDetails } from "./page"; // Assuming type is exported from page.tsx

interface ManageMembersClientUIProps {
  collectiveId: string;
  collectiveName: string;
  initialMembers: MemberWithDetails[];
  isOwner: boolean;
}

export default function ManageMembersClientUI({
  collectiveId,
  collectiveName,
  initialMembers,
  isOwner,
}: ManageMembersClientUIProps) {
  // TODO: Implement UI for inviting users, listing members, changing roles, removing members
  // This will involve forms, server action calls, and state management for the list of members.

  console.log("ManageMembersClientUI Props:", {
    collectiveId,
    collectiveName,
    initialMembers,
    isOwner,
  });

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        Members of {collectiveName}
      </h2>
      {isOwner && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Placeholder for Invite User Form (Owners only)
          </p>
          {/* <InviteUserForm collectiveId={collectiveId} /> */}
        </div>
      )}
      {initialMembers.length > 0 ? (
        <ul>
          {initialMembers.map((member) => (
            <li
              key={member.id}
              className="border-b py-2 flex justify-between items-center"
            >
              <div>
                <span className="font-medium">
                  {member.user?.full_name || "Unknown User"}
                </span>
                <span className="text-sm text-muted-foreground ml-2">
                  (Role: {member.role})
                </span>
              </div>
              {isOwner &&
                member.user?.id !==
                  /* current user ID, if different from owner */ "" && (
                  <div>
                    {/* Placeholder for Change Role / Remove buttons */}
                    <button className="text-xs text-blue-500 hover:underline mr-2">
                      Change Role
                    </button>
                    <button className="text-xs text-destructive hover:underline">
                      Remove
                    </button>
                  </div>
                )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No members found.</p>
      )}
    </div>
  );
}
