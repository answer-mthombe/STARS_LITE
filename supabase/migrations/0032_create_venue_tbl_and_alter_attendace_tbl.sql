-- ====================================================================
-- MIGRATION: Create streamlined venues table and link to sessions
-- ====================================================================

CREATE TABLE public.venues (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campus_name text NOT NULL, -- Simplified: no separate campuses table needed
  
  name text NOT NULL,
  building_name text,
  capacity integer,
  is_active boolean DEFAULT true,
  
  -- Tracks how the venue is set up for geofencing
  location_type text NOT NULL DEFAULT 'point', 
  
  -- Used if location_type is 'point'
  latitude numeric,        
  longitude numeric,
  radius_meters numeric DEFAULT 50,
  
  -- Used if location_type is 'polygon'
  polygon_coordinates jsonb, 
  
  created_at timestamp with time zone DEFAULT now(),
  
  -- 1. Ensure the location_type is exactly one or the other
  CONSTRAINT valid_location_type CHECK (location_type IN ('point', 'polygon')),
  
  -- 2. Strict check: If point, require lat/lng. If polygon, require JSON coordinates.
  CONSTRAINT valid_setup CHECK (
    (location_type = 'point' AND latitude IS NOT NULL AND longitude IS NOT NULL) OR
    (location_type = 'polygon' AND polygon_coordinates IS NOT NULL)
  ),
  
  CONSTRAINT unique_venue_per_campus UNIQUE (campus_name, name)
);

-- Clean up the temporary text column from the previous migration and link the new table
ALTER TABLE public.attendance_sessions
  DROP COLUMN IF EXISTS venue_name,
  ADD COLUMN venue_id text REFERENCES public.venues(id) ON DELETE SET NULL;