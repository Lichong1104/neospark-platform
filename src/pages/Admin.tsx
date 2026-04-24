import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BrutalCard,
  BrutalCardHeader,
  BrutalCardTitle,
  BrutalCardContent,
} from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import { BrutalInput } from "@/components/ui/brutal-input";
import { BrutalTabs } from "@/components/ui/brutal-tabs";
import adminApi from "@/api/admin";
import { STATIC_BASE_URL } from "@/api/request";
import type {
  AdminDrawingRecord,
  AdminOverview,
  AdminPagedResponse,
  AdminStripePayment,
  AdminUserDetail,
  AdminUserListResponse,
  AdminVideoRecord,
  AdminWechatPayment,
} from "@/types/admin";
import { Coins, RefreshCw, Search, Users } from "lucide-react";

type TabKey = "overview" | "users" | "userDetail" | "payments";

const toStorageUrl = (url: string): string =>
  url.startsWith("http") ? url : `${STATIC_BASE_URL}${url}`;

const Admin: React.FC = () => {
  const { t } = useTranslation();
  const tabLabels = useMemo(
    () => ({
      overview: t("admin.tabs.overview"),
      users: t("admin.tabs.users"),
      userDetail: t("admin.tabs.userDetail"),
      payments: t("admin.tabs.payments"),
    }),
    [t]
  );
  const tabKeys: TabKey[] = ["overview", "users", "userDetail", "payments"];
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(20);
  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState<AdminUserListResponse | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);

  const [drawingRecords, setDrawingRecords] =
    useState<AdminPagedResponse<AdminDrawingRecord> | null>(null);
  const [videoRecords, setVideoRecords] =
    useState<AdminPagedResponse<AdminVideoRecord> | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [drawingPage, setDrawingPage] = useState(1);
  const [videoPage, setVideoPage] = useState(1);
  const recordsPageSize = 20;

  const [stripePage, setStripePage] = useState(1);
  const [wechatPage, setWechatPage] = useState(1);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [stripePayments, setStripePayments] =
    useState<AdminPagedResponse<AdminStripePayment> | null>(null);
  const [wechatPayments, setWechatPayments] =
    useState<AdminPagedResponse<AdminWechatPayment> | null>(null);
  const [recordsViewTab, setRecordsViewTab] = useState<"drawing" | "video">(
    "drawing"
  );
  const [paymentsViewTab, setPaymentsViewTab] = useState<"stripe" | "wechat">(
    "stripe"
  );

  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [pointsTargetUser, setPointsTargetUser] = useState<{
    id: number;
    email: string;
    name: string | null;
  } | null>(null);
  const [pointsValue, setPointsValue] = useState("10");
  const [pointsNote, setPointsNote] = useState("");
  const [pointsSubmitting, setPointsSubmitting] = useState(false);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      setOverview(await adminApi.getOverview());
    } catch {
      toast.error(t("admin.toast.overviewFailed"));
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, [t]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      setUsers(
        await adminApi.getUsers({
          page: usersPage,
          page_size: usersPageSize,
          search: userSearch.trim() ? userSearch.trim() : undefined,
        })
      );
    } catch {
      toast.error(t("admin.toast.usersFailed"));
      setUsers(null);
    } finally {
      setUsersLoading(false);
    }
  }, [t, usersPage, usersPageSize, userSearch]);

  const loadUserDetail = useCallback(async () => {
    if (!selectedUserId) return;
    setUserDetailLoading(true);
    try {
      setUserDetail(await adminApi.getUserDetail(selectedUserId));
    } catch {
      toast.error(t("admin.toast.userDetailFailed"));
      setUserDetail(null);
    } finally {
      setUserDetailLoading(false);
    }
  }, [selectedUserId, t]);

  const loadUserRecords = useCallback(async () => {
    if (!selectedUserId) return;
    setRecordsLoading(true);
    try {
      const [draw, vid] = await Promise.all([
        adminApi.getUserDrawingRecords(selectedUserId, {
          page: drawingPage,
          page_size: recordsPageSize,
        }),
        adminApi.getUserVideoRecords(selectedUserId, {
          page: videoPage,
          page_size: recordsPageSize,
        }),
      ]);
      setDrawingRecords(draw);
      setVideoRecords(vid);
    } catch {
      toast.error(t("admin.toast.recordsFailed"));
      setDrawingRecords(null);
      setVideoRecords(null);
    } finally {
      setRecordsLoading(false);
    }
  }, [drawingPage, selectedUserId, t, videoPage]);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const [stripe, wechat] = await Promise.all([
        adminApi.getStripePayments({ page: stripePage, page_size: 20 }),
        adminApi.getWechatPayments({ page: wechatPage, page_size: 20 }),
      ]);
      setStripePayments(stripe);
      setWechatPayments(wechat);
    } catch {
      toast.error(t("admin.toast.paymentsFailed"));
      setStripePayments(null);
      setWechatPayments(null);
    } finally {
      setPaymentsLoading(false);
    }
  }, [stripePage, t, wechatPage]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (activeTab === "users") void loadUsers();
    if (activeTab === "userDetail") {
      void loadUserDetail();
      void loadUserRecords();
    }
    if (activeTab === "payments") void loadPayments();
  }, [activeTab, loadUsers, loadUserDetail, loadUserRecords, loadPayments]);

  const usersTotalPages = useMemo(() => {
    if (!users) return 1;
    return Math.max(1, Math.ceil(users.total / users.page_size));
  }, [users]);
  const usersAdminCount = useMemo(
    () => (users?.items ?? []).filter((x) => x.is_admin).length,
    [users]
  );
  const usersPagePointsSum = useMemo(
    () =>
      (users?.items ?? []).reduce((sum, x) => sum + (x.total_points ?? 0), 0),
    [users]
  );

  const onRefresh = () => {
    void loadOverview();
    if (activeTab === "users") void loadUsers();
    if (activeTab === "userDetail") {
      void loadUserDetail();
      void loadUserRecords();
    }
    if (activeTab === "payments") void loadPayments();
  };

  const selectUserFromList = (id: number) => {
    setSelectedUserId(id);
    setDrawingPage(1);
    setVideoPage(1);
    setActiveTab("userDetail");
  };

  const openAddPointsDialog = (user: {
    id: number;
    email: string;
    name: string | null;
  }) => {
    setPointsTargetUser(user);
    setPointsValue("10");
    setPointsNote("");
    setPointsDialogOpen(true);
  };

  const submitAddPointsForUser = async () => {
    if (!pointsTargetUser) return;
    const points = Number(pointsValue);
    if (!Number.isFinite(points) || points === 0) {
      toast.error(t("admin.toast.pointsInvalidAmount"));
      return;
    }

    setPointsSubmitting(true);
    try {
      await adminApi.addPoints({
        user_id: pointsTargetUser.id,
        points,
        note: pointsNote.trim() ? pointsNote.trim() : undefined,
      });
      toast.success(t("admin.toast.pointsUpdated"));
      setPointsDialogOpen(false);
      await loadUsers();
      if (selectedUserId === pointsTargetUser.id) await loadUserDetail();
    } catch {
      toast.error(t("admin.toast.pointsAddFailed"));
    } finally {
      setPointsSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-5 pb-5">
          {/* Header */}
          <BrutalCard shadow="default" className="overflow-hidden">
            <BrutalCardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-5 px-5">
              <div>
                <h1 className="text-lg font-bold uppercase tracking-widest">
                  {t("admin.title")}
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("admin.subtitle")}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <BrutalChip icon={<Users className="h-3 w-3" />}>
                    {t("admin.overview.stats.totalUsers")}:{" "}
                    {users?.total ?? overview?.total_users ?? 0}
                  </BrutalChip>
                  <BrutalChip icon={<Coins className="h-3 w-3" />}>
                    {t("admin.overview.stats.todayDrawing")}:{" "}
                    {overview?.today_drawing_count ?? 0}
                  </BrutalChip>
                </div>
              </div>
              <BrutalButton
                size="sm"
                variant="outline"
                onClick={onRefresh}
                className="gap-2 self-start md:self-auto"
              >
                <RefreshCw className="h-4 w-4" />
                {t("admin.actions.refresh")}
              </BrutalButton>
            </BrutalCardContent>
          </BrutalCard>

          {/* Tabs */}
          <BrutalCard shadow="default" className="overflow-hidden">
            <BrutalTabs
              className="[&>button]:px-4 [&>button]:py-2.5 [&>button]:text-sm [&>button]:tracking-wider"
              tabs={tabKeys.map((k) => tabLabels[k])}
              activeTab={tabLabels[activeTab]}
              onTabChange={(label) => {
                const key = tabKeys.find((k) => tabLabels[k] === label)!;
                setActiveTab(key);
              }}
            />
          </BrutalCard>

          {/* Overview */}
          {activeTab === "overview" ? (
            <section className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                <StatCard
                  label={t("admin.overview.stats.totalUsers")}
                  value={overview?.total_users ?? 0}
                  loading={overviewLoading}
                />
                <StatCard
                  label={t("admin.overview.stats.todayNewUsers")}
                  value={overview?.today_new_users ?? 0}
                  loading={overviewLoading}
                />
                <StatCard
                  label={t("admin.overview.stats.stripeSubs")}
                  value={overview?.total_stripe_subscriptions ?? 0}
                  loading={overviewLoading}
                />
                <StatCard
                  label={t("admin.overview.stats.wechatPaidOrders")}
                  value={overview?.total_wechat_paid_orders ?? 0}
                  loading={overviewLoading}
                />
                <StatCard
                  label={t("admin.overview.stats.todayDrawing")}
                  value={overview?.today_drawing_count ?? 0}
                  loading={overviewLoading}
                />
                <StatCard
                  label={t("admin.overview.stats.todayVideo")}
                  value={overview?.today_video_count ?? 0}
                  loading={overviewLoading}
                />
              </div>
              <BrutalCard shadow="default">
                <BrutalCardHeader>
                  <BrutalCardTitle className="text-sm">
                    {t("admin.overview.tipsTitle")}
                  </BrutalCardTitle>
                </BrutalCardHeader>
                <BrutalCardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>- {t("admin.overview.tipAdminMissing")}</p>
                  <p>- {t("admin.overview.tip403")}</p>
                  <p>- {t("admin.overview.tipBase")}</p>
                </BrutalCardContent>
              </BrutalCard>
            </section>
          ) : null}

          {/* Users */}
          {activeTab === "users" ? (
            <section className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard
                  label={t("admin.overview.stats.totalUsers")}
                  value={users?.total ?? 0}
                />
                <StatCard
                  label={t("admin.users.roleAdmin")}
                  value={usersAdminCount}
                />
                <StatCard
                  label={t("admin.users.columns.totalPoints")}
                  value={usersPagePointsSum}
                />
              </div>

              <BrutalCard shadow="default">
                <BrutalCardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <BrutalCardTitle className="text-sm">
                      {t("admin.users.title")}
                    </BrutalCardTitle>
                    <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                      <div className="relative w-full md:w-auto">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <BrutalInput
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder={t("admin.users.searchPlaceholder")}
                          className="w-full md:w-[320px] pl-9"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <BrutalButton
                          size="sm"
                          variant="primary"
                          disabled={usersLoading}
                          onClick={() => {
                            setUsersPage(1);
                            void loadUsers();
                          }}
                        >
                          {t("admin.actions.search")}
                        </BrutalButton>
                        <BrutalButton
                          size="sm"
                          variant="outline"
                          disabled={usersLoading}
                          onClick={() => {
                            setUserSearch("");
                            setUsersPage(1);
                            void loadUsers();
                          }}
                        >
                          {t("admin.actions.reset")}
                        </BrutalButton>
                      </div>
                    </div>
                  </div>
                </BrutalCardHeader>
                <BrutalCardContent className="p-0">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-4 pt-3 text-[11px] text-muted-foreground">
                    <div>
                      {t("admin.users.page")}{" "}
                      <span className="text-sm font-bold text-foreground">
                        {users?.page ?? usersPage}
                      </span>{" "}
                      / {usersTotalPages} ·{" "}
                      <span className="text-sm font-bold text-foreground">
                        {users?.total ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{t("admin.users.pageSize")}</span>
                      <select
                        className="h-9 border-brutal border-foreground bg-background px-2 text-foreground font-mono text-xs"
                        value={usersPageSize}
                        onChange={(e) => {
                          setUsersPageSize(Number(e.target.value));
                          setUsersPage(1);
                        }}
                      >
                        {[10, 20, 50, 100].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <BrutalButton
                        size="sm"
                        variant="outline"
                        disabled={usersLoading || usersPage <= 1}
                        onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                      >
                        {t("admin.actions.prev")}
                      </BrutalButton>
                      <BrutalButton
                        size="sm"
                        variant="outline"
                        disabled={usersLoading || usersPage >= usersTotalPages}
                        onClick={() => setUsersPage((p) => p + 1)}
                      >
                        {t("admin.actions.next")}
                      </BrutalButton>
                    </div>
                  </div>

                  <ScrollArea className="h-[480px] border-t-brutal border-foreground">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-foreground/15">
                          <TableHead className="text-[11px] uppercase tracking-wider">
                            {t("admin.users.columns.id")}
                          </TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider">
                            {t("admin.users.columns.email")}
                          </TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider">
                            {t("admin.users.columns.name")}
                          </TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider">
                            {t("admin.users.columns.role")}
                          </TableHead>
                          <TableHead className="text-right text-[11px] uppercase tracking-wider">
                            {t("admin.users.columns.available")}
                          </TableHead>
                          <TableHead className="text-right text-[11px] uppercase tracking-wider">
                            {t("admin.users.columns.frozen")}
                          </TableHead>
                          <TableHead className="text-right text-[11px] uppercase tracking-wider">
                            {t("admin.users.columns.totalPoints")}
                          </TableHead>
                          <TableHead className="text-right text-[11px] uppercase tracking-wider">
                            {t("admin.users.columns.action")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center text-muted-foreground"
                            >
                              {t("admin.state.loading")}
                            </TableCell>
                          </TableRow>
                        ) : !users || users.items.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center text-muted-foreground"
                            >
                              {t("admin.users.empty")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          users.items.map((u) => (
                            <TableRow
                              key={u.id}
                              className="border-b border-foreground/10 hover:bg-secondary/60"
                            >
                              <TableCell className="text-sm font-bold font-mono">
                                {u.id}
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                {u.email}
                              </TableCell>
                              <TableCell className="text-sm">
                                {u.name ?? "-"}
                              </TableCell>
                              <TableCell>
                                {u.is_admin ? (
                                  <Badge className="bg-accent-purple text-card border border-foreground/30">
                                    {t("admin.users.roleAdmin")}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="border-foreground/30 text-foreground"
                                  >
                                    {t("admin.users.roleUser")}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm font-semibold font-mono">
                                {u.available_points}
                              </TableCell>
                              <TableCell className="text-right text-sm font-mono">
                                {u.frozen_points}
                              </TableCell>
                              <TableCell className="text-right text-sm font-bold font-mono">
                                {u.total_points}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="inline-flex gap-2">
                                  <BrutalButton
                                    size="sm"
                                    variant="yellow"
                                    onClick={() =>
                                      openAddPointsDialog({
                                        id: u.id,
                                        email: u.email,
                                        name: u.name,
                                      })
                                    }
                                  >
                                    {t("admin.actions.addPoints")}
                                  </BrutalButton>
                                  <BrutalButton
                                    size="sm"
                                    variant="cyan"
                                    onClick={() => selectUserFromList(u.id)}
                                  >
                                    {t("admin.actions.inspect")}
                                  </BrutalButton>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </BrutalCardContent>
              </BrutalCard>
            </section>
          ) : null}

          {/* User Detail */}
          {activeTab === "userDetail" ? (
            <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
              <div className="xl:col-span-4 space-y-5">
                <BrutalCard shadow="default">
                  <BrutalCardHeader>
                    <BrutalCardTitle className="text-sm">
                      {t("admin.userDetail.title")}
                    </BrutalCardTitle>
                  </BrutalCardHeader>
                  <BrutalCardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      {t("admin.userDetail.hint")}
                    </p>
                    <div className="flex gap-2">
                      <BrutalInput
                        value={selectedUserId ? String(selectedUserId) : ""}
                        onChange={(e) =>
                          setSelectedUserId(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder={t("admin.userDetail.userIdPlaceholder")}
                      />
                      <BrutalButton
                        size="sm"
                        variant="primary"
                        className="shrink-0 whitespace-nowrap"
                        disabled={
                          !selectedUserId || userDetailLoading || recordsLoading
                        }
                        onClick={() => {
                          void loadUserDetail();
                          void loadUserRecords();
                        }}
                      >
                        {t("admin.actions.load")}
                      </BrutalButton>
                    </div>
                  </BrutalCardContent>
                </BrutalCard>

                <BrutalCard shadow="default">
                  <BrutalCardHeader>
                    <BrutalCardTitle className="text-sm">
                      {t("admin.userDetail.profileTitle")}
                    </BrutalCardTitle>
                  </BrutalCardHeader>
                  <BrutalCardContent>
                    <KV k="id" v={userDetail?.id ?? "-"} />
                    <KV k="email" v={userDetail?.email ?? "-"} />
                    <KV k="name" v={userDetail?.name ?? "-"} />
                    <KV
                      k="is_admin"
                      v={userDetail ? String(userDetail.is_admin) : "-"}
                    />
                    <KV k="created_at" v={userDetail?.created_at ?? "-"} />
                  </BrutalCardContent>
                </BrutalCard>

                <BrutalCard shadow="default">
                  <BrutalCardHeader>
                    <BrutalCardTitle className="text-sm">
                      {t("admin.userDetail.pointsTitle")}
                    </BrutalCardTitle>
                  </BrutalCardHeader>
                  <BrutalCardContent>
                    <KV
                      k="available_points"
                      v={userDetail?.points?.available_points ?? "-"}
                    />
                    <KV
                      k="frozen_points"
                      v={userDetail?.points?.frozen_points ?? "-"}
                    />
                    <KV
                      k="total_points"
                      v={userDetail?.points?.total_points ?? "-"}
                    />
                    <KV
                      k="expires_at"
                      v={userDetail?.points?.expires_at ?? "-"}
                    />
                  </BrutalCardContent>
                </BrutalCard>
              </div>

              <div className="xl:col-span-8 space-y-5 h-full">
                <BrutalCard shadow="default" className="h-full">
                  <BrutalCardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <BrutalCardTitle className="text-sm">
                        {recordsViewTab === "drawing"
                          ? t("admin.userDetail.drawingTitle")
                          : t("admin.userDetail.videoTitle")}
                      </BrutalCardTitle>
                      <div className="flex items-center gap-3">
                        <div className="flex border-brutal border-foreground">
                          {(["drawing", "video"] as const).map((tab) => (
                            <button
                              key={tab}
                              onClick={() => setRecordsViewTab(tab)}
                              className={`px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-r-brutal border-foreground last:border-r-0 transition-none ${
                                recordsViewTab === tab
                                  ? "bg-foreground text-background"
                                  : "bg-background text-foreground hover:bg-secondary"
                              }`}
                            >
                              {tab === "drawing"
                                ? t("admin.userDetail.drawingTitle")
                                : t("admin.userDetail.videoTitle")}
                            </button>
                          ))}
                        </div>
                        <Pager
                          page={
                            recordsViewTab === "drawing"
                              ? drawingPage
                              : videoPage
                          }
                          disabledPrev={
                            recordsLoading ||
                            (recordsViewTab === "drawing"
                              ? drawingPage
                              : videoPage) <= 1
                          }
                          disabledNext={recordsLoading}
                          onPrev={() =>
                            recordsViewTab === "drawing"
                              ? setDrawingPage((p) => Math.max(1, p - 1))
                              : setVideoPage((p) => Math.max(1, p - 1))
                          }
                          onNext={() =>
                            recordsViewTab === "drawing"
                              ? setDrawingPage((p) => p + 1)
                              : setVideoPage((p) => p + 1)
                          }
                          t={t}
                        />
                      </div>
                    </div>
                  </BrutalCardHeader>
                  <BrutalCardContent className="p-0">
                    <ScrollArea className="h-[520px] border-t-brutal border-foreground">
                      <div className="p-4 space-y-3">
                        {recordsLoading ? (
                          <StateText>{t("admin.state.loading")}</StateText>
                        ) : recordsViewTab === "drawing" ? (
                          !drawingRecords ||
                          drawingRecords.items.length === 0 ? (
                            <StateText>{t("admin.state.noRecords")}</StateText>
                          ) : (
                            drawingRecords.items.map((r) => (
                              <RecordCard key={r.message_id}>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                  <div>
                                    {t("admin.userDetail.status")}: {r.status} ·{" "}
                                    {t("admin.userDetail.model")}: {r.model}
                                  </div>
                                  <div>{r.created_at}</div>
                                </div>
                                <div className="mt-2 text-sm font-medium whitespace-pre-wrap">
                                  {r.content}
                                </div>
                                {r.images?.length ? (
                                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                                    {r.images.slice(0, 8).map((img) => (
                                      <a
                                        key={img.local_path}
                                        href={toStorageUrl(img.url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="overflow-hidden border-brutal border-foreground"
                                        title={t("admin.userDetail.openImage")}
                                      >
                                        <img
                                          src={toStorageUrl(img.url)}
                                          className="h-24 w-full object-cover"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                ) : null}
                                {r.error_msg ? (
                                  <div className="mt-2 text-xs text-accent-red">
                                    {r.error_msg}
                                  </div>
                                ) : null}
                              </RecordCard>
                            ))
                          )
                        ) : !videoRecords || videoRecords.items.length === 0 ? (
                          <StateText>{t("admin.state.noRecords")}</StateText>
                        ) : (
                          videoRecords.items.map((r) => (
                            <RecordCard key={r.task_id}>
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <div>
                                  {t("admin.userDetail.status")}: {r.status} ·{" "}
                                  {t("admin.userDetail.model")}: {r.model}
                                </div>
                                <div>{r.submitted_at}</div>
                              </div>
                              <div className="mt-2 text-sm font-medium whitespace-pre-wrap">
                                {r.prompt}
                              </div>
                              {r.video_url ? (
                                <a
                                  href={toStorageUrl(r.video_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-3 inline-block text-xs underline"
                                >
                                  {t("admin.userDetail.openVideo")}
                                </a>
                              ) : null}
                              {r.error_msg ? (
                                <div className="mt-2 text-xs text-accent-red">
                                  {r.error_msg}
                                </div>
                              ) : null}
                            </RecordCard>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </BrutalCardContent>
                </BrutalCard>
              </div>
            </section>
          ) : null}

          {/* Payments */}
          {activeTab === "payments" ? (
            <section className="grid grid-cols-1 gap-5">
              <BrutalCard shadow="default">
                <BrutalCardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <BrutalCardTitle className="text-sm">
                      {paymentsViewTab === "stripe"
                        ? t("admin.payments.stripeTitle")
                        : t("admin.payments.wechatTitle")}
                    </BrutalCardTitle>
                    <div className="flex items-center gap-3">
                      <div className="flex border-brutal border-foreground">
                        {(["stripe", "wechat"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setPaymentsViewTab(tab)}
                            className={`px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-r-brutal border-foreground last:border-r-0 transition-none ${
                              paymentsViewTab === tab
                                ? "bg-foreground text-background"
                                : "bg-background text-foreground hover:bg-secondary"
                            }`}
                          >
                            {tab === "stripe"
                              ? t("admin.payments.stripeTitle")
                              : t("admin.payments.wechatTitle")}
                          </button>
                        ))}
                      </div>
                      <Pager
                        page={
                          paymentsViewTab === "stripe" ? stripePage : wechatPage
                        }
                        disabledPrev={
                          paymentsLoading ||
                          (paymentsViewTab === "stripe"
                            ? stripePage
                            : wechatPage) <= 1
                        }
                        disabledNext={paymentsLoading}
                        onPrev={() =>
                          paymentsViewTab === "stripe"
                            ? setStripePage((p) => Math.max(1, p - 1))
                            : setWechatPage((p) => Math.max(1, p - 1))
                        }
                        onNext={() =>
                          paymentsViewTab === "stripe"
                            ? setStripePage((p) => p + 1)
                            : setWechatPage((p) => p + 1)
                        }
                        t={t}
                      />
                    </div>
                  </div>
                </BrutalCardHeader>
                <BrutalCardContent className="p-0">
                  <ScrollArea className="h-[520px] border-t-brutal border-foreground">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-foreground/15">
                          {paymentsViewTab === "stripe" ? (
                            <>
                              <TableHead className="text-[11px] uppercase tracking-wider">
                                {t("admin.payments.columnsStripe.user")}
                              </TableHead>
                              <TableHead className="text-[11px] uppercase tracking-wider">
                                {t("admin.payments.columnsStripe.plan")}
                              </TableHead>
                              <TableHead className="text-[11px] uppercase tracking-wider">
                                {t("admin.payments.columnsStripe.interval")}
                              </TableHead>
                              <TableHead className="text-[11px] uppercase tracking-wider">
                                {t("admin.payments.columnsStripe.status")}
                              </TableHead>
                              <TableHead className="text-[11px] uppercase tracking-wider">
                                {t("admin.payments.columnsStripe.periodEnd")}
                              </TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead className="text-[11px] uppercase tracking-wider">
                                {t("admin.payments.columnsWechat.user")}
                              </TableHead>
                              <TableHead className="text-[11px] uppercase tracking-wider">
                                {t("admin.payments.columnsWechat.plan")}
                              </TableHead>
                              <TableHead className="text-right text-[11px] uppercase tracking-wider">
                                {t("admin.payments.columnsWechat.amountFen")}
                              </TableHead>
                              <TableHead className="text-right text-[11px] uppercase tracking-wider">
                                {t("admin.payments.columnsWechat.points")}
                              </TableHead>
                              <TableHead className="text-[11px] uppercase tracking-wider">
                                {t("admin.payments.columnsWechat.paidAt")}
                              </TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentsLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center text-muted-foreground"
                            >
                              {t("admin.state.loading")}
                            </TableCell>
                          </TableRow>
                        ) : paymentsViewTab === "stripe" ? (
                          !stripePayments ||
                          stripePayments.items.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center text-muted-foreground"
                              >
                                {t("admin.state.noData")}
                              </TableCell>
                            </TableRow>
                          ) : (
                            stripePayments.items.map((p) => (
                              <TableRow
                                key={p.id}
                                className="border-b border-foreground/10 hover:bg-secondary/60"
                              >
                                <TableCell>
                                  <div className="font-semibold">{p.email}</div>
                                  <div className="text-xs text-muted-foreground font-mono">
                                    id: {p.user_id}
                                  </div>
                                </TableCell>
                                <TableCell>{p.plan_key}</TableCell>
                                <TableCell>{p.billing_interval}</TableCell>
                                <TableCell>{p.status}</TableCell>
                                <TableCell>
                                  {p.current_period_end ?? "-"}
                                </TableCell>
                              </TableRow>
                            ))
                          )
                        ) : !wechatPayments ||
                          wechatPayments.items.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center text-muted-foreground"
                            >
                              {t("admin.state.noData")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          wechatPayments.items.map((p) => (
                            <TableRow
                              key={p.id}
                              className="border-b border-foreground/10 hover:bg-secondary/60"
                            >
                              <TableCell>
                                <div className="font-semibold">{p.email}</div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  id: {p.user_id}
                                </div>
                              </TableCell>
                              <TableCell>{p.plan_key}</TableCell>
                              <TableCell className="text-right font-mono">
                                {p.amount_fen}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {p.points}
                              </TableCell>
                              <TableCell>{p.paid_at ?? "-"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </BrutalCardContent>
              </BrutalCard>
            </section>
          ) : null}
        </div>
      </main>

      <Dialog open={pointsDialogOpen} onOpenChange={setPointsDialogOpen}>
        <DialogContent className="sm:max-w-md border-brutal border-foreground brutal-shadow bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold uppercase tracking-wider">
              <Coins className="h-4 w-4" />
              {t("admin.actions.addPoints")}
            </DialogTitle>
            <DialogDescription>
              {pointsTargetUser
                ? `${pointsTargetUser.email}${
                    pointsTargetUser.name ? ` (${pointsTargetUser.name})` : ""
                  }`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("admin.points.points")}
              </div>
              <BrutalInput
                value={pointsValue}
                onChange={(e) => setPointsValue(e.target.value)}
                placeholder={t("admin.points.amountPlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("admin.points.note")}
              </div>
              <BrutalInput
                value={pointsNote}
                onChange={(e) => setPointsNote(e.target.value)}
                placeholder={t("admin.points.notePlaceholder")}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <BrutalButton
              variant="outline"
              onClick={() => setPointsDialogOpen(false)}
            >
              {t("common.cancel")}
            </BrutalButton>
            <BrutalButton
              variant="primary"
              disabled={pointsSubmitting}
              onClick={() => void submitAddPointsForUser()}
            >
              {pointsSubmitting
                ? t("admin.state.loading")
                : t("admin.actions.submit")}
            </BrutalButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const BrutalChip: React.FC<{
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, children }) => (
  <span className="inline-flex items-center gap-1.5 border-brutal border-foreground bg-accent-cyan px-3 py-1 text-xs font-bold uppercase tracking-wider text-foreground">
    {icon}
    {children}
  </span>
);

const StatCard: React.FC<{
  label: string;
  value: number;
  loading?: boolean;
}> = ({ label, value, loading }) => (
  <BrutalCard shadow="default" className="overflow-hidden">
    <BrutalCardContent className="py-4 px-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <span className="inline-block w-2 h-2 bg-accent-cyan border border-foreground" />
      </div>
      <div className="mt-2 text-3xl md:text-4xl font-black tracking-tight font-mono tabular-nums">
        {loading ? "..." : value ?? 0}
      </div>
    </BrutalCardContent>
  </BrutalCard>
);

const Pager: React.FC<{
  page: number;
  disabledPrev: boolean;
  disabledNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  t: (key: string) => string;
}> = ({ page, disabledPrev, disabledNext, onPrev, onNext, t }) => (
  <div className="flex items-center gap-2">
    <BrutalButton
      size="sm"
      variant="outline"
      onClick={onPrev}
      disabled={disabledPrev}
    >
      {t("admin.actions.prev")}
    </BrutalButton>
    <span className="text-xs text-muted-foreground font-mono">
      {t("admin.users.page")} {page}
    </span>
    <BrutalButton
      size="sm"
      variant="outline"
      onClick={onNext}
      disabled={disabledNext}
    >
      {t("admin.actions.next")}
    </BrutalButton>
  </div>
);

const RecordCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border-brutal border-foreground bg-card p-3 brutal-shadow">
    {children}
  </div>
);

const StateText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-xs text-muted-foreground font-mono">{children}</div>
);

const KV: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div className="flex items-baseline justify-between gap-3 py-1 border-b border-foreground/10 last:border-b-0">
    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
      {k}
    </span>
    <span className="text-sm font-semibold text-right break-all font-mono">
      {v}
    </span>
  </div>
);

export default Admin;
