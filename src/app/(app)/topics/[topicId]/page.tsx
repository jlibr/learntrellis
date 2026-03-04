import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const BLOOM_ORDER = ["remember", "understand", "apply", "analyze", "evaluate", "create"];

function bloomLabel(level: string | null): string {
  if (!level) return "";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function statusBadgeVariant(status: string): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "mastered": return "success";
    case "active": return "info";
    case "mastery_pending": return "warning";
    case "reteach": return "danger";
    case "locked":
    default: return "default";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "locked": return "Locked";
    case "active": return "Active";
    case "mastery_pending": return "Pending Mastery";
    case "mastered": return "Mastered";
    case "reteach": return "Reteach";
    default: return status;
  }
}

export default async function TopicOverviewPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const supabase = await createClient();

  const { data: topic } = await supabase
    .from("topics")
    .select("id, title, goal, background, status")
    .eq("id", topicId)
    .single();

  if (!topic) {
    notFound();
  }

  // Redirect to assessment if still onboarding
  if (topic.status === "onboarding" || topic.status === "assessing") {
    redirect(`/topics/${topicId}/assess`);
  }

  // Get modules with lesson counts
  const { data: modules } = await supabase
    .from("modules")
    .select("id, title, description, sequence_order, bloom_level, status, mastery_score")
    .eq("topic_id", topicId)
    .order("sequence_order", { ascending: true });

  // Get lesson counts per module
  const moduleIds = (modules || []).map(m => m.id);
  const { data: lessons } = moduleIds.length > 0
    ? await supabase
        .from("lessons")
        .select("id, module_id, status")
        .in("module_id", moduleIds)
    : { data: [] as Array<{ id: string; module_id: string; status: string }> };

  // Get due SRS card count
  const { count: dueReviewCount } = await supabase
    .from("srs_cards")
    .select("id", { count: "exact", head: true })
    .eq("topic_id", topicId)
    .lte("next_review_at", new Date().toISOString());

  // Group lessons by module
  const lessonsByModule: Record<string, Array<{ id: string; status: string }>> = {};
  for (const lesson of (lessons || [])) {
    if (!lessonsByModule[lesson.module_id]) {
      lessonsByModule[lesson.module_id] = [];
    }
    lessonsByModule[lesson.module_id].push(lesson);
  }

  // Calculate overall progress
  const totalLessons = (lessons || []).length;
  const completedLessons = (lessons || []).filter(l => l.status === "completed").length;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Find active module and next lesson
  const activeModule = (modules || []).find(m => m.status === "active");
  const activeModuleLessons = activeModule ? (lessonsByModule[activeModule.id] || []) : [];
  const nextPendingLesson = activeModuleLessons.find(l => l.status === "pending");
  const nextInProgressLesson = activeModuleLessons.find(l => l.status === "in_progress");
  const nextLesson = nextInProgressLesson || nextPendingLesson;

  // Check if active module has all lessons completed (mastery test needed)
  const activeModuleAllComplete = activeModule
    ? activeModuleLessons.length > 0 && activeModuleLessons.every(l => l.status === "completed")
    : false;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between animate-in">
        <div>
          <h1 className="text-2xl font-bold text-[#eeeeef] tracking-[-0.025em]">{topic.title}</h1>
          {topic.goal && (
            <p className="mt-2 text-[#a8a8b0]">{topic.goal}</p>
          )}
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">Back</Button>
        </Link>
      </div>

      {/* Progress bar and stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 animate-in-delay-1">
        <Card className="p-4">
          <p className="text-xs text-[#6e6e78]">Overall Progress</p>
          <p className="mt-1 text-lg font-medium text-[#eeeeef]">{overallProgress}%</p>
          <Progress value={overallProgress} className="mt-2" />
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#6e6e78]">Lessons Complete</p>
          <p className="mt-1 text-lg font-medium text-[#eeeeef]">
            {completedLessons} / {totalLessons}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#6e6e78]">Reviews Due</p>
          <p className={`mt-1 text-lg font-medium ${(dueReviewCount || 0) > 0 ? "text-amber-400" : "text-[#eeeeef]"}`}>
            {dueReviewCount || 0}
          </p>
          {(dueReviewCount || 0) > 0 && (
            <Link href={`/topics/${topicId}/review`}>
              <span className="text-xs text-amber-500 hover:underline">Start review</span>
            </Link>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex gap-3">
        {(dueReviewCount || 0) > 0 && (
          <Link href={`/topics/${topicId}/review`}>
            <Button variant="secondary" size="sm">
              Review ({dueReviewCount} due)
            </Button>
          </Link>
        )}
        {nextLesson && !activeModuleAllComplete && (
          <Link href={`/topics/${topicId}/lesson?lessonId=${nextLesson.id}`}>
            <Button variant="primary" size="sm">
              Continue Learning
            </Button>
          </Link>
        )}
        {activeModuleAllComplete && activeModule && (
          <Link href={`/topics/${topicId}/test?moduleId=${activeModule.id}`}>
            <Button variant="primary" size="sm">
              Take Mastery Test
            </Button>
          </Link>
        )}
      </div>

      {/* Module list */}
      <div className="mt-8 space-y-4 animate-in-delay-2">
        <h2 className="text-lg font-medium text-[#eeeeef]">Curriculum</h2>

        {(!modules || modules.length === 0) ? (
          <Card>
            <p className="text-center text-sm text-[#6e6e78]">
              No modules yet. Your curriculum is being generated.
            </p>
          </Card>
        ) : (
          modules.map((mod) => {
            const modLessons = lessonsByModule[mod.id] || [];
            const modCompleted = modLessons.filter(l => l.status === "completed").length;
            const modProgress = modLessons.length > 0
              ? Math.round((modCompleted / modLessons.length) * 100)
              : 0;

            return (
              <Card
                key={mod.id}
                className={`transition-colors ${
                  mod.status === "locked" ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#6e6e78]">
                        Module {mod.sequence_order}
                      </span>
                      {mod.bloom_level && (
                        <span className="text-xs text-[#45454d]">
                          {bloomLabel(mod.bloom_level)}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 font-medium text-[#eeeeef]">{mod.title}</h3>
                    {mod.description && (
                      <p className="mt-1 text-sm text-[#a8a8b0] line-clamp-2">
                        {mod.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={statusBadgeVariant(mod.status)}>
                    {statusLabel(mod.status)}
                  </Badge>
                </div>

                {mod.status !== "locked" && (
                  <div className="mt-3">
                    <Progress
                      value={mod.status === "mastered" ? 100 : modProgress}
                      label={`${modCompleted}/${modLessons.length} lessons`}
                    />
                  </div>
                )}

                {mod.mastery_score !== null && (
                  <p className="mt-2 text-xs text-[#6e6e78]">
                    Mastery score: {Math.round(mod.mastery_score)}%
                  </p>
                )}

                {mod.status === "active" && modLessons.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {activeModuleAllComplete && activeModule?.id === mod.id ? (
                      <Link href={`/topics/${topicId}/test?moduleId=${mod.id}`}>
                        <Button variant="primary" size="sm">Take Mastery Test</Button>
                      </Link>
                    ) : nextLesson && activeModule?.id === mod.id ? (
                      <Link href={`/topics/${topicId}/lesson?lessonId=${nextLesson.id}`}>
                        <Button variant="primary" size="sm">Next Lesson</Button>
                      </Link>
                    ) : null}
                  </div>
                )}

                {mod.status === "mastery_pending" && (
                  <div className="mt-3">
                    <Link href={`/topics/${topicId}/test?moduleId=${mod.id}`}>
                      <Button variant="secondary" size="sm">
                        Confirmation Test
                      </Button>
                    </Link>
                    <p className="mt-1 text-xs text-amber-400">
                      Come back after 24 hours to confirm mastery
                    </p>
                  </div>
                )}

                {mod.status === "reteach" && (
                  <div className="mt-3">
                    <Link href={`/topics/${topicId}/test?moduleId=${mod.id}`}>
                      <Button variant="danger" size="sm">Reteach Test</Button>
                    </Link>
                    <p className="mt-1 text-xs text-red-400">
                      Review the material and try the mastery test again
                    </p>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
