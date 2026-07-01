import { createDetailList, setDetail } from "../dom.js?v=full-audit-20260701";
import { canRunJob, runJob } from "../job-processor.js?v=full-audit-20260701";
import { completeJob, getAllJobEvents, updateJobStatus } from "../stores.js?v=full-audit-20260701";

export function createJobsView(ctx) {
  return function showJobs() {
    const wrap = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = "Local Jobs";
    wrap.append(heading);

    const jobs = getAllJobEvents(ctx.state);
    const summary = document.createElement("p");
    summary.className = "job-summary";
    const queued = jobs.filter((job) => job.state === "queued").length;
    const planned = jobs.filter((job) => job.state === "planned").length;
    const simulationOnly = jobs.filter((job) => job.state === "simulation_only").length;
    summary.textContent = `${queued} queued / ${planned} planned / ${simulationOnly} simulation-only / ${jobs.length} total`;
    wrap.append(summary);

    if (!jobs.length) {
      const empty = document.createElement("p");
      empty.textContent = "No local jobs queued.";
      wrap.append(empty);
      setDetail("Jobs", wrap);
      return;
    }

    const addJobAction = (parent, job, label, status, className = "") => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = ["mini-button", "job-action", className].filter(Boolean).join(" ");
      button.textContent = label;
      button.addEventListener("click", () => {
        updateJobStatus(ctx.state, job.store, job.id, status);
        showJobs();
      });
      parent.append(button);
    };

    const addRunAction = (parent, job) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mini-button job-action job-action-run";
      button.textContent = "Run";
      button.addEventListener("click", async () => {
        updateJobStatus(ctx.state, job.store, job.id, "running");
        showJobs();
        try {
          const result = await runJob(job, ctx.state);
          completeJob(ctx.state, job.store, job.id, result, "completed");
        } catch (error) {
          completeJob(
            ctx.state,
            job.store,
            job.id,
            {
              runner: "word-map-refresh-v1",
              processed_at: new Date().toISOString(),
              message: error?.message || "Job failed.",
            },
            "failed",
          );
        }
        showJobs();
      });
      parent.append(button);
    };

    wrap.append(
      createDetailList(jobs.slice(0, 80), (li, job) => {
        li.className = "job-entry";
        const top = document.createElement("div");
        top.className = "job-entry-top";
        const type = document.createElement("span");
        type.className = "job-type";
        type.textContent = job.type;
        const status = document.createElement("span");
        status.className = `job-status ${job.state}`;
        status.textContent = job.state;
        top.append(type, status);

        const meta = document.createElement("div");
        meta.className = "reference-meta";
        meta.textContent = `${job.store} - ${job.created_at}`;

        const payload = document.createElement("pre");
        payload.className = "job-payload";
        payload.textContent = JSON.stringify(job.payload || {}, null, 2);

        const actions = document.createElement("div");
        actions.className = "job-actions";
        if (job.state === "queued") {
          addJobAction(actions, job, "Plan Review", "planned", "job-action-review");
        }
        if ((job.state === "queued" || job.state === "planned") && canRunJob(job)) {
          addRunAction(actions, job);
        }
        if (job.state !== "simulation_only") {
          addJobAction(actions, job, "Simulate", "simulation_only", "job-action-process");
        }
        if (job.state !== "queued") {
          addJobAction(actions, job, "Requeue", "queued", "job-action-requeue");
        }

        li.append(top, meta, payload, actions);

        if (job.result) {
          const result = document.createElement("pre");
          result.className = "job-payload job-result";
          result.textContent = JSON.stringify(job.result, null, 2);
          li.append(result);
        }
      }),
    );
    setDetail("Jobs", wrap);
  };
}
