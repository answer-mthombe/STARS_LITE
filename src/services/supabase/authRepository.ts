import type { User } from "@supabase/supabase-js";

import { requireSupabaseClient } from "@/supabase/client";

import { mapAuthError } from "@/utils/supabase/mapAuthError";


export async function signInWithEmailPassword(email: string, password: string): Promise<User> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  if (!data.user) throw new Error("Sign-in succeeded but no user was returned.");
  return data.user;
}

export async function signOutSupabase(): Promise<void> {
  const { error } = await requireSupabaseClient().auth.signOut();
  if (error) throw error;
}

export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  const supabase = requireSupabaseClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}




export async function registerStudentSupabase(args: {
  email: string;
  password: string;
  fullName: string;
  studentNumber: string;
  gender: string;
  facultyId: string;
  courseId: string;
}) {
  const supabase = requireSupabaseClient();

  // ==========================================
  // STEP 1: Create the secure Auth User
  // ==========================================
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign-up succeeded but no user returned.");

  const authId = authData.user.id;

  // ==========================================
  // STEP 2: Create the Student Record
  // ==========================================
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .insert({
      id: `stud-${args.studentNumber}`,
      student_number: args.studentNumber,
      full_name: args.fullName,
      gender: args.gender,
      faculty_id: args.facultyId,
      course_id: args.courseId,
      email: args.email,
    })
    .select()
    .single();

  if (studentError) {
    console.error("Failed to insert student:", studentError);
    // If Step 2 fails, we stop entirely. No student is created, no profile is created.
    throw new Error("Registration failed. Could not save academic details.");
  }

  const newStudentId = studentData.id;

  // ==========================================
  // STEP 3: Create the User Profile (The Bridge)
  // ==========================================
  const { error: profileError } = await supabase
    .from("user_profiles")
    .insert({
      id: authId,
      role: "student",
      email: args.email,
      linked_student_id: newStudentId,    // FIX 3: Changed from 'student_id' to match schema
      linked_person_id: newStudentId
    });

  // ==========================================
  // STEP 4: THE ROLLBACK (The Safety Net!)
  // ==========================================
  if (profileError) {
    console.error("Profile creation failed. Rolling back database...", profileError);
    
    // SAFETY NET: Because Step 3 failed, we delete the Student we just created in Step 2!
    await supabase.from("students").delete().eq("id", newStudentId);

    throw new Error("Registration failed. Database changes have been safely reversed.");
  }

  // If we reach here, all 3 steps succeeded perfectly!
  return { authUser: authData.user, studentId: newStudentId };
}




