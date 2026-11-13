-- Remember whether an expense was entered as a custom split, even when the
-- shares happen to be equal. Null means "infer from the share amounts"
-- for rows created before this column existed.

alter table public.expenses
  add column if not exists split_mode text;

alter table public.expenses
  drop constraint if exists expenses_split_mode_check;

alter table public.expenses
  add constraint expenses_split_mode_check
  check (split_mode is null or split_mode in ('equal', 'custom'));
