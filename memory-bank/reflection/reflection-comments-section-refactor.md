# Reflection: CommentsSection Refactor

## Review & Comparison to Plan

- **Goal:** Refactor `CommentsSection` by extracting `CommentItem`, `CommentForm`, and the comment tree logic into a hook.
- **Outcome:** The implementation perfectly matches the plan.

## Successes

- **Maintainability:** `CommentsSection.tsx` is now a clean orchestrator, not a monolithic component.
- **Modularity:** `CommentItem` and `CommentForm` are now independent, reusable components.
- **Separation of Concerns:** Clear separation between UI, data transformation, and state management.

## Challenges

- **Prop Drilling:** The refactor required passing several state handlers down. For a more complex component, a Context would be better.
- **Unrelated Build Error:** A Stripe API version error blocked the initial build test, highlighting the need for overall codebase health.

## Lessons Learned

- **Custom Hooks for Logic:** Encapsulating complex data logic in custom hooks is a very effective pattern.
- **Incremental Refactoring:** Breaking the refactor into smaller, verifiable steps is a safe and efficient strategy.

## Improvements

- **Optimistic UI:** Could be added for a more responsive comment posting experience.
- **State Management:** For a more complex system, a centralized state solution (Context or Zustand) would be beneficial.

## Status

- Reflection complete. Ready for archiving.
