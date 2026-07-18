"use client";

/**
 * Supabase Realtime — multi-user sync + presence for the Project Planner.
 *
 * Uses Broadcast + Presence channels only (no table replication needed).
 * Requires two public env vars in Vercel:
 *   NEXT_PUBLIC_SUPABASE_URL       e.g. https://<project-ref>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  the project's anon key
 * When they're absent, everything degrades gracefully: `getRealtime()`
 * returns null and the planner simply works single-user (plus a
 * refresh-on-focus fallback).
 */

import { createClient, type SupabaseClient, type RealtimeChannel } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function getRealtime(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client =
    url && key
      ? createClient(url, key, { realtime: { params: { eventsPerSecond: 5 } } })
      : null;
  return client;
}

export type PresencePeer = { key: string; name: string };

/**
 * Join a project's channel: presence-track this viewer, receive peers'
 * change broadcasts. Returns a `notify` to call after local mutations and a
 * cleanup function. Everything is a no-op when realtime is unconfigured.
 */
export function joinProjectChannel(opts: {
  projectId: string;
  user: { id: string; name: string };
  onPeers: (peers: PresencePeer[]) => void;
  onRemoteChange: () => void;
}): { notify: () => void; leave: () => void; enabled: boolean } {
  const supabase = getRealtime();
  if (!supabase) return { notify: () => {}, leave: () => {}, enabled: false };

  // A per-tab key so the same user in two tabs shows once per tab.
  const key = `${opts.user.id}:${Math.random().toString(36).slice(2, 8)}`;
  const channel: RealtimeChannel = supabase.channel(`project:${opts.projectId}`, {
    config: { presence: { key }, broadcast: { self: false } },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ name: string }>();
      const peers: PresencePeer[] = Object.entries(state).flatMap(([k, metas]) =>
        metas.map((m) => ({ key: k, name: m.name }))
      );
      opts.onPeers(peers);
    })
    .on("broadcast", { event: "project-changed" }, () => {
      opts.onRemoteChange();
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel.track({ name: opts.user.name });
      }
    });

  return {
    enabled: true,
    notify: () => {
      void channel.send({ type: "broadcast", event: "project-changed", payload: { by: opts.user.id } });
    },
    leave: () => {
      void supabase.removeChannel(channel);
    },
  };
}
