import { useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
import {
  fetchNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/store/action/notificationAction";

// Shared by the bell slider and the Inbox tab: the inbox list, agent names, paging and read actions.
const useNotificationInbox = (orgId) => {
  const dispatch = useDispatch();
  const router = useRouter();

  const { inbox, bridges } = useCustomSelector((state) => ({
    inbox: state?.notificationReducer?.inbox,
    bridges: state?.bridgeReducer?.org?.[orgId]?.orgs || [],
  }));

  const agentNames = useMemo(() => Object.fromEntries(bridges.map((bridge) => [bridge._id, bridge.name])), [bridges]);

  const items = inbox?.items || [];
  const hasMore = items.length < (inbox?.total || 0);

  const refresh = useCallback(() => dispatch(fetchNotificationsAction({ page: 1 })), [dispatch]);

  const loadMore = useCallback(() => {
    if (inbox?.loading || !hasMore) return;
    dispatch(fetchNotificationsAction({ page: (inbox?.page || 1) + 1 }));
  }, [dispatch, inbox?.loading, inbox?.page, hasMore]);

  const markRead = useCallback(
    (item) => {
      if (!item.read) dispatch(markNotificationReadAction(item._id));
    },
    [dispatch]
  );

  const markAllRead = useCallback(() => dispatch(markAllNotificationsReadAction()), [dispatch]);

  const openAgent = useCallback(
    (item) => {
      markRead(item);
      router.push(`/org/${orgId}/agents/configure/${item.agent_id}`);
    },
    [markRead, router, orgId]
  );

  return {
    items,
    agentNames,
    unreadCount: inbox?.unreadCount || 0,
    loading: inbox?.loading || false,
    fetched: inbox?.fetched || false,
    hasMore,
    refresh,
    loadMore,
    markRead,
    markAllRead,
    openAgent,
  };
};

export default useNotificationInbox;
