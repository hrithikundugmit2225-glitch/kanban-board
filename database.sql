create table boards (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  user_id uuid references auth.users(id) on delete cascade,
  is_starred boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table columns (
  id uuid default gen_random_uuid() primary key,
  board_id uuid references boards(id) on delete cascade,
  title text not null,
  position integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table tasks (
  id uuid default gen_random_uuid() primary key,
  column_id uuid references columns(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  priority text not null default 'LOW',
  position integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
