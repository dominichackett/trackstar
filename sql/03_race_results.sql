CREATE TABLE race_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    race_id uuid REFERENCES races(id),
    driver_id uuid REFERENCES drivers(id),
    class_type text,
    position integer,
    position_in_class integer,
    vehicle text,
    laps integer,
    elapsed_time interval,
    gap_to_first interval,
    gap_to_previous interval,
    best_lap_number integer,
    best_lap_time interval,
    best_lap_speed_kph float,
    created_at timestamptz DEFAULT now()
);
