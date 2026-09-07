import { PRELOADED_SUBJECTS } from "./preloaded-subjects";
import { createPreloadedTarget } from "./social-repository";

/** Safe to rerun: canonical_key and alias constraints make this idempotent. */
export async function seedPreloadedSubjects(actorId = "system-seed") {
  let created = 0;
  let existing = 0;
  for (const subject of PRELOADED_SUBJECTS) {
    const result = await createPreloadedTarget(subject, actorId, "curated_seed");
    if (result.created) created += 1;
    else existing += 1;
  }
  return { created, existing, total: PRELOADED_SUBJECTS.length };
}