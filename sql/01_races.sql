CREATE TABLE races (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text,
    date date,
    created_at timestamptz DEFAULT now()
);
