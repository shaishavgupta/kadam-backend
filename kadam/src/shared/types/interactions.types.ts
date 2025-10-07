// User Enrollment Types
export interface UserEnrollment {
    id: number;
    created_at: string;
    user_id: number;
    course_id: number;
    content_id: number;
    completed_at?: string;
    progress: number;
}

export interface CreateUserEnrollmentDTO {
    course_id: number;
    module_id: number;
    content_id: number;
    progress?: number;
}

export interface UpdateUserEnrollmentDTO {
    completed_at?: string;
    progress?: number;
}
