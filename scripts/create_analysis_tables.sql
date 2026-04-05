-- gap_comparisons: one row per (flagged employee, peer, category)
CREATE TABLE IF NOT EXISTS gap_comparisons (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id       uuid NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    employee_id  text NOT NULL REFERENCES employees(employee_id),
    peer_id      text NOT NULL REFERENCES employees(employee_id),
    category     text NOT NULL,
    gap_percent  numeric,
    reason       text,
    CONSTRAINT gap_comparisons_unique UNIQUE (run_id, employee_id, category, peer_id)
);

CREATE INDEX IF NOT EXISTS gap_comparisons_employee_idx       ON gap_comparisons (employee_id);
CREATE INDEX IF NOT EXISTS gap_comparisons_run_category_idx   ON gap_comparisons (run_id, category);
CREATE INDEX IF NOT EXISTS gap_comparisons_emp_category_idx   ON gap_comparisons (employee_id, category);
