-- PayGap Radar: Resolution / Close-the-Loop tables
-- Run once in Supabase SQL editor.

-- 1a. Add is_risky flag to employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_risky BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS employees_is_risky_idx ON employees (is_risky);

-- 1b. Audit log of applied raises
CREATE TABLE IF NOT EXISTS resolved_actions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at     timestamptz NOT NULL DEFAULT now(),
    employee_id    text NOT NULL REFERENCES employees(employee_id),
    category       text NOT NULL,
    old_salary     numeric NOT NULL,
    new_salary     numeric NOT NULL,
    increase       numeric NOT NULL,
    still_flagged  boolean NOT NULL,
    note           text
);

CREATE INDEX IF NOT EXISTS resolved_actions_employee_idx ON resolved_actions (employee_id);
CREATE INDEX IF NOT EXISTS resolved_actions_created_idx  ON resolved_actions (created_at DESC);

-- 1c. Archive of resolved gap_comparisons rows
CREATE TABLE IF NOT EXISTS gap_comparisons_archive (
    id            uuid PRIMARY KEY,
    run_id        uuid NOT NULL,
    created_at    timestamptz NOT NULL,
    archived_at   timestamptz NOT NULL DEFAULT now(),
    employee_id   text NOT NULL,
    peer_id       text NOT NULL,
    category      text NOT NULL,
    gap_percent   numeric,
    reason        text
);

CREATE INDEX IF NOT EXISTS gap_comparisons_archive_employee_idx ON gap_comparisons_archive (employee_id);
