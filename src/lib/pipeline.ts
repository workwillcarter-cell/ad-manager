import type { Stage, Role } from "@/generated/prisma/client"

export const STAGES: Stage[] = [
  "IDEATION",
  "READY",
  "AI_GENERATION",
  "AI_REVIEW",
  "EDITING",
  "EDITOR_REVIEW",
  "LAUNCHED",
  "PERFORMANCE_REVIEW",
  "COMPLETED",
]

export const STAGE_LABELS: Record<Stage, string> = {
  IDEATION: "Planning",
  READY: "Ready",
  AI_GENERATION: "AI Generation",
  AI_REVIEW: "AI Review",
  EDITING: "Editing",
  EDITOR_REVIEW: "Editor Review",
  LAUNCHED: "Launched",
  PERFORMANCE_REVIEW: "Performance Review",
  COMPLETED: "Completed",
}

export const STAGE_COLORS: Record<Stage, string> = {
  IDEATION: "bg-gray-100 text-gray-700 border-gray-200",
  READY: "bg-blue-100 text-blue-700 border-blue-200",
  AI_GENERATION: "bg-purple-100 text-purple-700 border-purple-200",
  AI_REVIEW: "bg-yellow-100 text-yellow-700 border-yellow-200",
  EDITING: "bg-blue-100 text-blue-700 border-blue-200",
  EDITOR_REVIEW: "bg-orange-100 text-orange-700 border-orange-200",
  LAUNCHED: "bg-green-100 text-green-700 border-green-200",
  PERFORMANCE_REVIEW: "bg-teal-100 text-teal-700 border-teal-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

export function nextStage(stage: Stage): Stage | null {
  const idx = STAGES.indexOf(stage)
  if (idx === -1 || idx === STAGES.length - 1) return null
  return STAGES[idx + 1]
}

export function canAdvance(stage: Stage, role: Role): boolean {
  if (role === "CEO") return stage === "IDEATION" || stage === "AI_REVIEW" || stage === "EDITOR_REVIEW"
  if (role === "AI_GENERATOR") return stage === "AI_GENERATION"
  if (role === "EDITOR") return stage === "EDITING"
  return false
}

export function canView(stage: Stage, role: Role): boolean {
  if (role === "CEO") return true
  if (role === "AI_GENERATOR") return ["READY", "AI_GENERATION", "AI_REVIEW"].includes(stage)
  if (role === "EDITOR") return ["AI_REVIEW", "EDITING", "EDITOR_REVIEW"].includes(stage)
  return false
}
