CREATE TABLE drivers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text,
    number integer,
    created_at timestamptz DEFAULT now()
);
