import { requireSupabaseClient } from "@/supabase/client";
import type { RegisterStudentArgs } from "@/store/authStore";

export async function registerStudentPipeline(args: RegisterStudentArgs & { email: string }) {
  const supabase = requireSupabaseClient();

  // ==========================================
  // STEP 1: Create the secure Auth User
  // ==========================================
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      data: {
        full_name: args.fullName,
      },
    },
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign-up succeeded but no user returned.");

  const authId = authData.user.id;

  console.log("👉 DEBUG [Step 1]: Supabase Auth UUID (authId):", authId);
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
    throw new Error("Registration failed. Could not save academic details.");
  }

  const newStudentId = studentData.id;
  
  console.log("👉 DEBUG [Step 2]: New Student ID:", newStudentId);

  // ==========================================
  // STEP 3: Create the User Profile (The Bridge)
  // ==========================================
  console.log("👉 DEBUG [Step 3]: Inserting into user_profiles -> id (UUID):", authId, "| linked_student_id (Text):", newStudentId);
  const { error: profileError } = await supabase
    .from("user_profiles")
    .insert({
      id: authId,
      role: "student",
      email: args.email,
      linked_student_id: newStudentId,
      linked_person_id: newStudentId
    });

  // ==========================================
  // STEP 4: THE ROLLBACK (The Safety Net!)
  // ==========================================
  if (profileError) {
    console.error("Profile creation failed. Rolling back database...", profileError);
    
    // SAFETY NET: Delete the Student we just created in Step 2
    await supabase.from("students").delete().eq("id", newStudentId);

    throw new Error("Registration failed. Database changes have been safely reversed.");
  }

  // If we reach here, all 3 steps succeeded perfectly!
  return { authUser: authData.user, studentId: newStudentId };
}