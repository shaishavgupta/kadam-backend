import { Topic } from "encore.dev/pubsub";

// Define event interfaces
export interface CourseUploadedEvent {
    courseId: number;
}

export const courseUploadedTopic = new Topic<CourseUploadedEvent>("course-uploaded", {
    deliveryGuarantee: "at-least-once",
});
