import { requireSupabaseClient } from "@/supabase";



export interface Venue {
  id: string;
  campusName: string;
  name: string;
  buildingName: string | null;
  capacity: number | null;
  locationType: "point" | "polygon";
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  polygonCoordinates: any | null;
}

export const venueRepository = {
  /**
   * Fetches all active venues, sorted by campus and then by venue name.
   */


  async listActiveVenues(): Promise<Venue[]> {
  const supabase = requireSupabaseClient();


    const { data, error } = await supabase
      .from("venues")
      .select("*")
      .eq("is_active", true)
      .order("campus_name", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching venues:", error);
      throw new Error("Failed to load venues. Please check your connection.");
    }

    return data.map((v: any) => ({
      id: v.id,
      campusName: v.campus_name,
      name: v.name,
      buildingName: v.building_name,
      capacity: v.capacity,
      locationType: v.location_type,
      latitude: v.latitude,
      longitude: v.longitude,
      radiusMeters: v.radius_meters,
      polygonCoordinates: v.polygon_coordinates,
    }));
  }
};