import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * useSupabaseRealtime
 *
 * @param table - The table name to subscribe to (e.g., "posts")
 * @param onChange - Callback for insert/update/delete events
 * @param filter - Optional filter (e.g., { column: "collective_id", value: "abc" })
 */
export function useSupabaseRealtime<T = unknown>(
  table: string,
  onChange: (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new?: T;
    old?: T;
  }) => void,
  filter?: { column: string; value: string | number }
) {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel = supabase.channel(`realtime:${table}`);
    let filterStr = table;
    if (filter) {
      filterStr = `${table}:${filter.column}=eq.${filter.value}`;
      channel = supabase.channel(filterStr);
    }
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        (payload) => {
          onChange({
            eventType: payload.eventType,
            new: payload.new as T | undefined,
            old: payload.old as T | undefined,
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter?.column, filter?.value]);
}
