// Content Types
export enum ContentType {
    VIDEO = 'video',
    QUIZ = 'quiz',
    NOTES = 'notes'
}

// Qualification Types
export enum QualificationType {
    DEGREE = 'degree',
    DIPLOMA = 'diploma',
    CERTIFICATION = 'certification'
}

// Achievement Types
export enum AchievementType {
    ACADEMIC = 'academic',
    SPORTS = 'sports',
    PROFESSIONAL = 'professional'
}

// Parent Types (for interactions)
export enum ParentType {
    CONTENT = 'content',
    COURSE = 'course',
    COMMENT = 'comment'
}

// Languages
export enum Language {
    ENGLISH = 'en',
    HINDI = 'hi'
}

// Gender
export enum Gender {
    MALE = 'male',
    FEMALE = 'female',
    OTHERS = 'others'
}

// Plan Types
export enum PlanType {
    FREE = 'free',
    PREMIUM = 'premium',
    PRO = 'pro'
}

export enum UserType {
    USER = 'user',
    ADMIN = 'admin',
    CREATOR = 'creator'
}

// File Types
export enum FileType {
    THUMBNAIL = 'thumbnail',
    VIDEO = 'video'
}

// S3 Operations
export enum S3Operation {
    PUT_OBJECT = 'putObject',
    GET_OBJECT = 'getObject'
}
