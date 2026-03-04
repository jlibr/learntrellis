import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

type TopicCardData = {
  id: string;
  title: string;
  goal: string | null;
  status: string;
  currentModule: { id: string; title: string | null; status: string } | null;
  totalLessons: number;
  completedLessons: number;
  dueReviewCount: number;
  nextAction: {
    type: "continue" | "review" | "test" | "assess" | "completed";
    href: string;
    label: string;
  };
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // Layout handles redirect
  }

  const { data: topics } = await supabase
    .from("topics")
    .select("id, title, goal, status, created_at")
    .order("created_at", { ascending: false });

  if (!topics || topics.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center animate-in">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-[#45454d]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
        </div>
        <h1 className="text-[28px] font-semibold text-[#eeeeef] tracking-[-0.025em]">
          Welcome to LearnTrellis
        </h1>
        <p className="mt-3 text-[15px] text-[#a8a8b0]">
          Start your first learning topic and let AI build a personalized
          curriculum for you.
        </p>
        <Link href="/topics/new">
          <Button variant="primary" size="lg" className="mt-8">
            Create your first topic
          </Button>
        </Link>
      </div>
    );
  }

  // Fetch all modules for these topics
  const topicIds = topics.map((t) => t.id);

  const { data: allModules } = await supabase
    .from("modules")
    .select("id, topic_id, title, status, sequence_order")
    .in("topic_id", topicIds)
    .order("sequence_order", { ascending: true });

  // Fetch all lessons for those modules
  const moduleIds = (allModules || []).map((m) => m.id);
  const { data: allLessons } =
    moduleIds.length > 0
      ? await supabase
          .from("lessons")
          .select("id, module_id, status")
          .in("module_id", moduleIds)
      : { data: [] as Array<{ id: string; module_id: string; status: string }> };

  // Fetch due SRS counts per topic
  const now = new Date().toISOString();
  const { data: dueCards } = await supabase
    .from("srs_cards")
    .select("id, topic_id")
    .in("topic_id", topicIds)
    .lte("next_review_at", now);

  // Build lookup maps
  const modulesByTopic: Record<
    string,
    Array<{ id: string; title: string | null; status: string; sequence_order: number }>
  > = {};
  for (const mod of allModules || []) {
    if (!modulesByTopic[mod.topic_id]) modulesByTopic[mod.topic_id] = [];
    modulesByTopic[mod.topic_id].push(mod);
  }

  const lessonsByModule: Record<
    string,
    Array<{ id: string; status: string }>
  > = {};
  for (const lesson of allLessons || []) {
    if (!lessonsByModule[lesson.module_id])
      lessonsByModule[lesson.module_id] = [];
    lessonsByModule[lesson.module_id].push(lesson);
  }

  const dueCountByTopic: Record<string, number> = {};
  for (const card of dueCards || []) {
    dueCountByTopic[card.topic_id] =
      (dueCountByTopic[card.topic_id] || 0) + 1;
  }

  // Build card data for each topic
  const topicCards: TopicCardData[] = topics.map((topic) => {
    const modules = modulesByTopic[topic.id] || [];
    const dueReviewCount = dueCountByTopic[topic.id] || 0;

    // Calculate total/completed lessons across all modules
    let totalLessons = 0;
    let completedLessons = 0;
    for (const mod of modules) {
      const modLessons = lessonsByModule[mod.id] || [];
      totalLessons += modLessons.length;
      completedLessons += modLessons.filter(
        (l) => l.status === "completed"
      ).length;
    }

    // Find current active module
    const activeModule =
      modules.find((m) => m.status === "active") ||
      modules.find((m) => m.status === "mastery_pending") ||
      modules.find((m) => m.status === "reteach") ||
      null;

    // Determine next action
    let nextAction: TopicCardData["nextAction"];

    if (
      topic.status === "onboarding" ||
      topic.status === "assessing"
    ) {
      nextAction = {
        type: "assess",
        href: `/topics/${topic.id}/assess`,
        label: "Continue Setup",
      };
    } else if (topic.status === "completed") {
      nextAction = {
        type: "completed",
        href: `/topics/${topic.id}`,
        label: "View Topic",
      };
    } else if (dueReviewCount > 0) {
      nextAction = {
        type: "review",
        href: `/topics/${topic.id}/review`,
        label: `Review (${dueReviewCount} due)`,
      };
    } else if (activeModule) {
      const activeModuleLessons = lessonsByModule[activeModule.id] || [];
      const allComplete =
        activeModuleLessons.length > 0 &&
        activeModuleLessons.every((l) => l.status === "completed");

      if (
        allComplete ||
        activeModule.status === "mastery_pending" ||
        activeModule.status === "reteach"
      ) {
        nextAction = {
          type: "test",
          href: `/topics/${topic.id}/test?moduleId=${activeModule.id}`,
          label: "Take Mastery Test",
        };
      } else {
        const nextLesson =
          activeModuleLessons.find((l) => l.status === "in_progress") ||
          activeModuleLessons.find((l) => l.status === "pending");
        nextAction = {
          type: "continue",
          href: nextLesson
            ? `/topics/${topic.id}/lesson?lessonId=${nextLesson.id}`
            : `/topics/${topic.id}`,
          label: "Continue Lesson",
        };
      }
    } else {
      nextAction = {
        type: "continue",
        href: `/topics/${topic.id}`,
        label: "View Topic",
      };
    }

    return {
      id: topic.id,
      title: topic.title,
      goal: topic.goal,
      status: topic.status,
      currentModule: activeModule
        ? {
            id: activeModule.id,
            title: activeModule.title,
            status: activeModule.status,
          }
        : null,
      totalLessons,
      completedLessons,
      dueReviewCount,
      nextAction,
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8 animate-in">
        <h1 className="text-[28px] font-semibold text-[#eeeeef] tracking-[-0.025em]">Your Topics</h1>
        <Link href="/topics/new">
          <Button variant="primary" size="sm">
            New Topic
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in-delay-1">
        {topicCards.map((card) => (
          <TopicCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

function TopicCard({ card }: { card: TopicCardData }) {
  const progressPercent =
    card.totalLessons > 0
      ? Math.round((card.completedLessons / card.totalLessons) * 100)
      : card.status === "onboarding" || card.status === "assessing"
      ? 5
      : 0;

  return (
    <Link href={card.nextAction.href} className="block group">
      <div className="rounded-[14px] border border-white/[0.07] bg-[#111113] p-6 flex flex-col transition-all duration-150 hover:bg-[#151517] hover:border-white/[0.10]">
        {/* Header row: title + status */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-[17px] font-semibold text-[#eeeeef] tracking-[-0.02em] group-hover:text-amber-400 transition-colors">
            {card.title}
          </h2>
          <Badge variant={statusVariant(card.status)}>
            {statusLabel(card.status)}
          </Badge>
        </div>

        {/* Goal */}
        {card.goal && (
          <p className="text-[14px] text-[#a8a8b0] leading-[1.5] line-clamp-2 mb-4">{card.goal}</p>
        )}

        {/* Current module */}
        {card.currentModule && (
          <p className="text-[13px] text-[#6e6e78] mb-4">
            Current module:{" "}
            <span className="text-[#a8a8b0]">
              {card.currentModule.title || "Module"}
            </span>
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-auto pt-2">
          <Progress
            value={progressPercent}
            label={
              card.totalLessons > 0
                ? `${card.completedLessons}/${card.totalLessons} lessons`
                : undefined
            }
          />
        </div>

        {/* Footer: SRS badge + CTA */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <div>
            {card.dueReviewCount > 0 && (
              <Badge variant="warning">
                {card.dueReviewCount} review{card.dueReviewCount !== 1 ? "s" : ""} due
              </Badge>
            )}
          </div>
          <span className="text-[13px] font-medium text-amber-400 group-hover:text-amber-300 transition-colors">
            {card.nextAction.label} →
          </span>
        </div>
      </div>
    </Link>
  );
}

function statusVariant(
  status: string
): "default" | "success" | "warning" | "info" {
  switch (status) {
    case "completed":
      return "success";
    case "active":
      return "info";
    case "onboarding":
    case "assessing":
      return "warning";
    default:
      return "default";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "onboarding":
      return "Setup";
    case "assessing":
      return "Assessing";
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}
