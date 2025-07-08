import { useEffect, useRef, type RefObject } from 'react';

type EventType = 'mousedown' | 'mouseup' | 'touchstart' | 'touchend';

/**
 * A hook that triggers a callback when a click occurs outside of the referenced element.
 *
 * @param ref - A React ref object pointing to the element to monitor.
 * @param handler - The callback function to execute when an outside click is detected.
 * @param eventType - The specific mouse/touch event to listen for. Defaults to 'mousedown'.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  eventType: EventType = 'mousedown',
): void {
  const savedHandler = useRef(handler);

  // Update the handler reference if it changes
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent): void => {
      // Do nothing if the click is inside the ref's element or its descendants
      if (ref.current === null || ref.current.contains(event.target as Node)) {
        return;
      }
      savedHandler.current(event);
    };

    document.addEventListener(eventType, listener);

    return () => {
      document.removeEventListener(eventType, listener);
    };
  }, [ref, eventType]);
}
