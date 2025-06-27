'use client';

import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';

import { logRecommendationFeedback } from './_actions';

interface RecommendationFeedbackButtonsProps {
  collectiveId: string;
}

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

const initialState: ActionResult = {
  success: false,
};

function SubmitButton({
  feedbackType,
}: {
  feedbackType: 'recommended_interested' | 'recommended_not_interested';
}): React.JSX.Element {
  const { pending } = useFormStatus();
  const isInterested = feedbackType === 'recommended_interested';

  return (
    <Button
      type="submit"
      name="feedbackType"
      value={feedbackType}
      variant="outline"
      size="sm"
      disabled={pending}
      aria-label={
        isInterested ? 'Mark as interested' : 'Mark as not interested'
      }
    >
      {pending ? (
        'Submitting...'
      ) : isInterested ? (
        <ThumbsUp className="h-4 w-4 mr-1" />
      ) : (
        <ThumbsDown className="h-4 w-4 mr-1" />
      )}
      {isInterested ? 'Interested' : 'Not Interested'}
    </Button>
  );
}

export default function RecommendationFeedbackButtons({
  collectiveId,
}: RecommendationFeedbackButtonsProps): React.JSX.Element {
  const [state, formAction] = useActionState(
    logRecommendationFeedback,
    initialState,
  );

  useEffect((): void => {
    if (state.success && state.message) {
      // Potential future use: trigger a toast notification or more complex UI update
    }
  }, [state.success, state.message]);

  // If feedback was successfully recorded (either new or already existed),
  // display the message and prevent further button submissions for this instance.
  if (
    state.success &&
    state.message &&
    (state.message === 'Feedback recorded successfully.' ||
      state.message === 'Feedback already recorded.')
  ) {
    return <p className="text-xs text-accent mt-1">{state.message}</p>;
  }

  return (
    <form action={formAction} className="flex items-center gap-2 mt-2">
      <input type="hidden" name="collectiveId" value={collectiveId} />
      <SubmitButton feedbackType="recommended_interested" />
      <SubmitButton feedbackType="recommended_not_interested" />
      {state.error && (
        <p className="text-xs text-destructive mt-1">Error: {state.error}</p>
      )}
      {/* More specific field errors can be displayed if needed from state.fieldErrors */}
    </form>
  );
}
