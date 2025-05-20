Goal: Reorganize files and naming for clarity and maintainability, aligning with the Atomic Design conventions. Remove or update any obsolete files.
Scope & Actions:
Normalize Component Naming: Ensure all component files use a consistent PascalCase naming. For example, in src/components/app/dashboard/molecules, rename skeleton components like compact-collective-card-skeleton.tsx to CompactCollectiveCardSkeleton.tsx (and similarly for recent-post-row-skeleton.tsx, etc.) for consistency
github.com
.
Restructure Directories if Needed: Audit component placement between co-located route components and the src/components directory. Decide on a clear convention (either co-locate all route-specific components under app/\*_/\_components or move them into the atomic design folders). For instance, components currently in src/app/dashboard/\_components (e.g. DashboardCollectiveCard.tsx) might be moved to src/components/app/dashboard/... if a single pattern is preferred.
Remove Obsolete Files/Docs: Delete placeholder files like .gitkeep and outdated planning docs if no longer needed. For example, if new-structure.md has served its purpose, remove it or integrate its relevant info into code comments. Similarly, review the .cursor/ rules files – if they are editor-specific and not used at runtime, consider removing them from the repository to reduce clutter.
Verify Atomic Design Separation: Ensure atoms, molecules, and organisms are properly categorized. e.g. Basic elements like buttons/inputs should reside in src/components/ui (already present
github.com
), whereas complex aggregates belong in src/components/app/.... Remove any duplicate or misplaced components across these folders.
Consistency in Exports: Check that each component has a clear default export or named export as needed, and update import paths to use the @/ alias (which is set to src/_) for cleaner imports. This improves developer experience by avoiding long relative paths.
