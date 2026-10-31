-- Contract step of the 2026-10-31 amendment (spec 001, migration plan; issue
-- #65). The code live in production since #67 reads and writes product.kind and
-- never touches categories, so they can go. The column goes first: it holds the
-- foreign key to the table. Its index, and the table's policies, trigger and
-- grants, are dropped with them.
alter table public.product drop column category_id;

drop table public.category;
