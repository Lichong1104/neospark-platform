import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import skillsApi from "@/api/skills";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { formatMaybeDate } from "@/lib/date";
import { cn } from "@/lib/utils";

/** 只读星级展示 */
function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i <= Math.round(value) ? "fill-foreground text-foreground" : "text-foreground/25"
          )}
        />
      ))}
    </span>
  );
}

/** 可交互星级输入：悬停预览，点击提交 */
function StarInput({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <span
      className="inline-flex items-center gap-1"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
          aria-label={`${i} star`}
          className="p-0.5 disabled:opacity-40"
        >
          <Star
            className={cn(
              "w-6 h-6 transition-colors",
              i <= shown
                ? "fill-accent-pink text-accent-pink"
                : "text-foreground/30 hover:text-foreground/50"
            )}
          />
        </button>
      ))}
    </span>
  );
}

const SkillReviews: React.FC<{ skillId: string }> = ({ skillId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const queryKey = ["skill-reviews", skillId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => skillsApi.getSkillReviews(skillId),
    enabled: !!skillId,
  });

  // my_review 到达后与本地草稿同步一次（编辑已有评论）
  React.useEffect(() => {
    if (data?.my_review) {
      setRating((prev) => prev ?? data.my_review!.rating);
      setComment((prev) => (prev ? prev : (data.my_review!.comment ?? "")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.my_review?.id]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: { rating?: number | null; comment?: string | null }) =>
      skillsApi.putSkillReview(skillId, payload),
    onSuccess: async () => {
      toast.success(t("skill.reviewSubmitted"));
      await invalidate();
    },
    onError: () => toast.error(t("skill.reviewSubmitFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: number) => skillsApi.deleteSkillReview(skillId, reviewId),
    onSuccess: async () => {
      toast.success(t("skill.reviewDeleted"));
      setDeleteTarget(null);
      await invalidate();
    },
    onError: () => toast.error(t("skill.reviewDeleteFailed")),
  });

  const handleSubmit = () => {
    const trimmed = comment.trim();
    if (rating == null && !trimmed) return;
    saveMutation.mutate({
      ...(rating != null ? { rating } : {}),
      ...(trimmed ? { comment: trimmed } : {}),
    });
  };

  const myReview = data?.my_review ?? null;

  return (
    <div className="border-brutal border-foreground bg-card brutal-shadow mt-6">
      <div className="px-6 py-2 border-b-brutal border-foreground bg-secondary/20 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("skill.reviews")}
        </span>
        {data && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("skill.ratingStats", {
              avg: data.rating_avg ?? "—",
              count: data.rating_count,
            })}
          </span>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* 聚合头部 */}
        <div className="flex items-center gap-4">
          <div className="text-4xl font-black tabular-nums">
            {data?.rating_avg ?? "—"}
          </div>
          <div className="space-y-1">
            {data?.rating_avg != null && <Stars value={data.rating_avg} />}
            <p className="text-xs text-muted-foreground">
              {t("skill.ratingCounts", {
                ratings: data?.rating_count ?? 0,
                comments: data?.comment_count ?? 0,
              })}
            </p>
          </div>
        </div>

        {/* 打分 / 评论表单 */}
        {isAuthenticated ? (
          <div className="border border-foreground/20 bg-background p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {myReview ? t("skill.updateReview") : t("skill.writeReview")}
              </span>
              <StarInput
                value={rating}
                onChange={(v) => {
                  setRating(v);
                  saveMutation.mutate({ rating: v });
                }}
                disabled={saveMutation.isPending}
              />
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("skill.reviewPlaceholder")}
              rows={3}
              maxLength={2000}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  saveMutation.isPending || (rating == null && !comment.trim())
                }
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider border-brutal border-foreground bg-foreground text-background hover:bg-accent-pink hover:text-foreground transition-none disabled:opacity-40"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {myReview?.comment ? t("skill.updateComment") : t("skill.submitReview")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              navigate("/login", { state: { from: `/skills/${skillId}` } })
            }
            className="w-full px-4 py-3 text-xs font-bold uppercase tracking-wider border-brutal border-foreground bg-background hover:bg-secondary transition-none"
          >
            {t("skill.loginToReview")}
          </button>
        )}

        {/* 评论列表 */}
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : data && data.comments.length > 0 ? (
          <ul className="space-y-4">
            {data.comments.map((review) => (
              <li
                key={review.id}
                className="border border-foreground/15 bg-background p-4"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar className="w-7 h-7 border border-foreground/20">
                    {review.user_avatar && (
                      <AvatarImage src={review.user_avatar} alt={review.user_name} />
                    )}
                    <AvatarFallback className="text-[10px] font-bold bg-secondary">
                      {review.user_name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{review.user_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatMaybeDate(review.created_at)}
                    </p>
                  </div>
                  {review.rating != null && <Stars value={review.rating} />}
                  {review.is_mine && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(review.id)}
                      aria-label={t("skill.deleteReview")}
                      className="p-1 text-muted-foreground hover:text-destructive transition-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {review.comment && (
                  <p className="mt-2 text-sm whitespace-pre-wrap break-words">
                    {review.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("skill.noReviews")}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("skill.deleteReviewTitle")}
        description={t("skill.deleteReviewConfirm")}
        confirmLabel={t("skill.confirmDelete")}
        cancelLabel={t("skill.cancel")}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget != null) deleteMutation.mutate(deleteTarget);
        }}
      />
    </div>
  );
};

export default SkillReviews;
