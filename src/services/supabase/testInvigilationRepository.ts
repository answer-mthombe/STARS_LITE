import { requireSupabaseClient} from "@/supabase/client";


export interface SupabaseStartTestParams {
  moduleId: string;
  lecturerId: string;
  title: string;
  sessionType: "test" | "exam";
  venueId: string;
  tutorInvigilators: { studentId: string; fullName: string }[];
}

export const testInvigilationRepository = {

/**
   * Fetches the active test session from Supabase to render the UI panel.
   */
  async getSession(sessionId: string) {
    const supabase = requireSupabaseClient();
    const { data, error } = await supabase
      .from("test_sessions")
      .select(`
        *,
        module:modules (
          id, module_code, module_name
        )
      `)
      .eq("id", sessionId)
      .single();

    if (error || !data) {
      console.error("Failed to fetch test session:", error?.message);
      return null;
    }

    return {
      id: data.id,
      moduleId: data.module_id,
      moduleCode: data.module?.module_code,
      moduleName: data.module?.module_name,
      title: data.title,
      lecturerId: data.lecturer_id,
      sessionType: data.session_type,
      venueId: data.venue_id,
      invigilators: data.invigilators || [],
      status: data.active ? "active" : "closed",
      startedAt: data.created_at,
    };
  },

  /**
   * Fetches all students marked present so far in this test.
   */
  async getMarks(sessionId: string) {
    const supabase = requireSupabaseClient();
    const { data, error } = await supabase
      .from("test_attendance_records")
      .select(`
        id,
        student_id,
        created_at,
        exam_status,
        student:students (
          student_number,
          full_name
        )
      `)
      .eq("test_session_id", sessionId);

    if (error) return [];

    return data.map((record: any) => ({
      id: record.id,
      studentId: record.student_id,
      studentNumber: record.student?.student_number,
      fullName: record.student?.full_name,
      timestamp: record.timestamp,
      status: record.exam_status,
    }));
  },

  /**
   * Marks a student as present/seated for the test/exam.
   */
  async markStudent(args: {
    testSessionId: string;
    studentNumber: string;
    tutorId?: string;
  }) {
    const supabase = requireSupabaseClient();
    
    // 1. Find the student by their student number
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, full_name")
      .eq("student_number", args.studentNumber.trim())
      .single();

    if (studentError || !student) {
      return { ok: false, reason: "Student not found." };
    }

    // 2. Insert them into the attendance records for this session
    const { data: mark, error: markError } = await supabase
      .from("test_attendance_records")
      .insert({
        id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
        test_session_id: args.testSessionId,
        student_id: student.id,
        exam_status: "seated",
        marked_by_tutor_id: args.tutorId || null
      })
      .select()
      .single();

    if (markError) {
      if (markError.code === "23505") { // Postgres unique constraint violation
        return { ok: false, reason: "Already marked present.", duplicate: true };
      }
      return { ok: false, reason: "Could not mark student." };
    }

    return { ok: true, mark: { ...mark, fullName: student.full_name } };
  },

  /**
   * Fetches available tutors from the public.tutors table for selection on the UI.
   */
  async listAvailableTutors() {
    const supabase = requireSupabaseClient();
    const { data, error } = await supabase
      .from("tutors")
      .select("id, full_name, student_id");

    if (error) {
      console.error("Error loading tutors:", error.message);
      return [];
    }

    return data.map((t: any) => ({
      id: t.id,
      studentId: t.student_id,
      fullName: t.full_name,
    }));
  },

  /**
   * Starts a live test or exam session in Supabase.
   */
 async startTest(params: SupabaseStartTestParams) {
    const supabase = requireSupabaseClient();
    

    

    // Store invigilators safely in the JSONB column
    const invigilatorsJson = params.tutorInvigilators.map(tutor => ({
      tutor_id: tutor.studentId,
      full_name: tutor.fullName,
      assigned_at: new Date().toISOString()
    }));

    const sessionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const { data: sessionData, error: sessionError } = await supabase
      .from("test_sessions")
      .insert({
        id: sessionId,
        module_id: params.moduleId,
        lecturer_id: params.lecturerId,
        title: params.title.trim(),
        session_type: params.sessionType,
        venue_id: params.venueId,
        invigilators: invigilatorsJson,
        active: true
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to start test session: ${sessionError.message}`);
    }

    return sessionData;
  },


 async endTestSession(sessionId: string, lecturerId: string) {
    const supabase = requireSupabaseClient();
    const now = new Date().toISOString();
    
    // 1. Close the session
    const { data: session, error: sessionError } = await supabase
      .from("test_sessions")
      .update({ active: false, ended_at: now })
      .eq("id", sessionId)
      .eq("lecturer_id", lecturerId) 
      .select("*, module:modules(module_code, module_name)")
      .single();

    if (sessionError || !session) {
      return { ok: false, reason: sessionError?.message || "Session not found." };
    }

    // 2. Auto-checkout anyone still "seated"
    await supabase
      .from("test_attendance_records")
      .update({ exam_status: "submitted", checkout_time: now })
      .eq("test_session_id", sessionId)
      .eq("exam_status", "seated");

    // 3. Scoop up final records for the register snapshot
    const { data: finalRecords } = await supabase
      .from("test_attendance_records")
      .select(`
        student_id,
        exam_status,
        checkout_time,
        student:students(student_number, full_name)
      `)
      .eq("test_session_id", sessionId);

    const mappedStudents = (finalRecords || []).map((r: any) => ({
      studentId: r.student_id,
      studentNumber: r.student?.student_number,
      fullName: r.student?.full_name,
      status: r.exam_status,
      checkoutTime: r.checkout_time
    }));

    // 4. Create the finalized historical register
    const { data: register, error: registerError } = await supabase
      .from("test_registers")
      .insert({
        id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
        test_session_id: sessionId,
        module_id: session.module_id,
        module_code: session.module?.module_code,
        module_name: session.module?.module_name,
        title: session.title,
        lecturer_id: session.lecturer_id,
        venue_id: session.venue_id,
        ended_at: now,
        students_present: mappedStudents
      })
      .select()
      .single();

    if (registerError) {
      console.error("Failed to generate final register:", registerError.message);
    } else {
      // 5. Link the register ID back to the session
      await supabase
        .from("test_sessions")
        .update({ register_id: register.id })
        .eq("id", sessionId);
    }

    return { ok: true, session };
  },

  async checkoutStudent(args: {
    testSessionId: string;
    studentNumber: string;
  }) {
    const supabase = requireSupabaseClient();
    
    // 1. Get the student's ID
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("student_number", args.studentNumber.trim())
      .single();

    if (studentError || !student) {
      return { ok: false, reason: "Student not found." };
    }

    // 2. Update their existing attendance record
    const { data: mark, error: updateError } = await supabase
      .from("test_attendance_records")
      .update({
        exam_status: "submitted",
        checkout_time: new Date().toISOString(),
      })
      .eq("test_session_id", args.testSessionId)
      .eq("student_id", student.id)
      .select()
      .single();

    if (updateError) {
      return { ok: false, reason: "Could not checkout student. Are they marked present?" };
    }

    return { ok: true, mark };
  }
,
async getActiveTestSessionsForLecturer(lecturerId: string) {
    const supabase = requireSupabaseClient();
    const { data, error } = await supabase
      .from("test_sessions")
      .select("id, title, session_type, active")
      .eq("lecturer_id", lecturerId)
      .eq("active", true)
     // .in("session_type", ["test", "exam"]);

    if (error) {
      console.error("Failed to fetch active test sessions:", error.message);
      return [];
    }

    return data || [];
  },

async getRecentCompletedTestsForLecturer(lecturerId: string) {
    const supabase = requireSupabaseClient();
    const { data, error } = await supabase
      .from("test_sessions")
      .select("id, title, session_type, ended_at")
      .eq("lecturer_id", lecturerId)
      .eq("active", false) // <-- We want CLOSED sessions
     // .in("session_type", ["test", "exam"])
      .order("ended_at", { ascending: false }) // Newest first
      .limit(2); // Just show the top 2 recent ones

    if (error) {
      console.error("Failed to fetch recent completed tests:", error.message);
      return [];
    }

    return data || [];
  },

  // async getTestRegisterSummary(sessionId: string) {
  //   const supabase = requireSupabaseClient();
    
  //   const { data, error } = await supabase
  //     .from("test_registers")
  //     .select(`
  //       *,
  //       module:modules(module_code),
  //       records:attendance_records(
  //         exam_status,
  //         checkout_time,
  //         student:students(id, student_number, full_name)
  //       ),
  //       invigilators:session_tutors(
  //         tutor:tutors(full_name)
  //       )
  //     `)
  //     .eq("id", sessionId)
  //     .single();

  //   if (error || !data) {
  //     console.error("Failed to load register summary:", error?.message);
  //     return null;
  //   }

  //   return {
  //     id: data.id,
  //     title: data.title || data.session_type,
  //     moduleCode: data.module?.module_code || "Unknown Module",
  //     invigilatorNames: data.invigilators?.map((i: any) => i.tutor?.full_name) || [],
  //     students: data.records?.map((r: any) => ({
  //       studentId: r.student?.id,
  //       studentNumber: r.student?.student_number,
  //       fullName: r.student?.full_name,
  //       present: true, 
  //       status: r.exam_status, // 'seated' or 'submitted'
  //       checkoutTime: r.checkout_time
  //     })) || []
  //   };
  // }

  async getTestRegisterSummary(sessionId: string) {
    const supabase = requireSupabaseClient();
    
    // We now query the static snapshot inside test_registers
    const { data, error } = await supabase
      .from("test_registers")
      .select("*")
      .eq("test_session_id", sessionId)
      .single();

    if (error || !data) {
      console.error("Failed to load finalized register summary:", error?.message);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      moduleCode: data.module_code || "Unknown Module",
      moduleName: data.module_name,
      students: data.students_present || [] // Already an array of JSON objects!
    };
  }
};