# Workflow

How a piece of work moves from idea to `main`, for people and for Claude Code.
It mirrors the console's model (its `CLAUDE.md` "Rover tickets" section and
the `commit-flow` and `sd-sync` skills), with one difference: this repo has no
`develop`. `main` is the integration line, so branches are cut from `main` and
pull requests target `main`. Brand branches are deploys, not review targets.

## The five steps

1. **Ticket first.** Create the Rover ticket before anything else, under the
   RemitSo project with company "Prymera (CO)". The description carries the
   problem, what will change, and a "Done when" list the PR can be checked
   against. Nothing is branched, committed or opened without a ticket
   number. Set the ETA before the ticket goes to in progress.
   **Assign it to Dhruv Patel**, who owns this repository: in Rover the
   record is `Dhruv`, `dhruv@remitso.com`. Assignment is a separate call
   (`rover_assign`) and worth reading back, because a ticket created with an
   assignee field the server does not recognise is created unassigned and
   then sits in nobody's queue. This holds for a ticket raised mid-task too.
2. **Branch from `main`.** `feature/sd-<n>-<short-slug>`, always cut from a
   fresh `origin/main`. One ticket, one branch; a stack of dependent PRs uses
   one ticket and numbered slugs (`feature/sd-512-guard-1-router`,
   `feature/sd-512-guard-2-redirects`).
3. **Pull request to `main`.** Title `SD-<n>: <what>`; body says why the
   change exists and how it was verified. CI must be green. Never an
   ordinary PR against `staging` or a brand branch.
4. **Merge.** The reviewer merges. A stack merges top-down (last PR first),
   or with delete-branch-on-merge on; otherwise GitHub retargets the next PR
   onto the surviving branch instead of `main`, which has happened here.
5. **Close out.** Fetch and fast-forward local `main`, delete the branch and
   any worktree. Then, with the owner's explicit yes, resolve the ticket with
   a closing note: what shipped, the PR number, the commit on `main`, how it
   was verified, and anything deliberately left open.

## While the work is in flight

- Progress goes to the ticket as one internal comment per review round,
  written for colleagues who will not open GitHub: state of the PR,
  decisions taken, what is still open and whose action is next.
- A defect found on the way that is outside the ticket's scope gets its own
  ticket. Not a silent fix, and not a note in the PR only.
- The closing note is the record the deployment ledger and the next audit
  read. It should let someone who was not there answer "what changed, where
  is it, and what is still owed" without opening the PR.

## Brand branches

Work reaches a brand by a deliberate merge of `main` into `<brand>_staging`,
under its own ticket, following `docs/tenant-branches.md` and `DEPLOY.md`.
The push is a deploy and is done by the person who owns the deployment.
