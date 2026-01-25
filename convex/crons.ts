import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup unused note images",
  { hours: 6 },
  internal.items.cleanupUnusedImages,
  { maxAgeMs: 24 * 60 * 60 * 1000 }
);

export default crons;
