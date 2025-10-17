import { Static, Type } from "@sinclair/typebox";
import { FileType, S3Operation } from "../shared/enums";

// Dynamic payload schemas based on banner type
const CourseBannerPayload = Type.Object({
    course_id: Type.Number(),
});

const ModuleBannerPayload = Type.Object({
    course_id: Type.Number(),
    module_id: Type.Number(),
});

const ContentBannerPayload = Type.Object({
    course_id: Type.Number(),
    module_id: Type.Number(),
    content_id: Type.Number(),
});

const ExpertBannerPayload = Type.Object({
    expert_id: Type.Number(),
    name: Type.String(),
    title: Type.String(),
    avatar_url: Type.String(),
});

export const Banners = Type.Object({
    image_url: Type.String(),
    type: Type.Union([
        Type.Literal('course'),
        Type.Literal('module'),
        Type.Literal('content'),
        Type.Literal('expert')
    ]),
    is_active: Type.Boolean(),
    payload: Type.Union([
        CourseBannerPayload,
        ModuleBannerPayload,
        ContentBannerPayload,
        ExpertBannerPayload
    ])
});

export const Categories = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    image_url: Type.String()
});

export const HomePageContentResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        banners: Type.Array(Banners),
        categories: Type.Optional(Type.Array(Categories)),
    }),
    message: Type.String()
});

export const LoginPageContentResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        background: Type.Array(Type.Array(Type.Object({
            image_url: Type.String()
        })))
    }),
    message: Type.String()
});

export const UnifiedPresignedUrlRequestSchema = Type.Object({
    courseId: Type.Number({ minimum: 1 }),
    moduleId: Type.Optional(Type.Number({ minimum: 1 })),
    contentId: Type.Optional(Type.Number({ minimum: 1 })),
    fileType: Type.Union([
        Type.Literal(FileType.THUMBNAIL),
        Type.Literal(FileType.VIDEO)
    ]),
    fileName: Type.Optional(Type.String()),
    operation: Type.Union([
        Type.Literal(S3Operation.PUT_OBJECT),
        Type.Literal(S3Operation.GET_OBJECT)
    ]),
    expiresIn: Type.Optional(Type.Number({ minimum: 60, maximum: 3600 }))
});

export const PresignedUrlResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(Type.Object({
        presignedUrl: Type.String(),
        s3Key: Type.String(),
        expiresIn: Type.Number()
    })),
    message: Type.String()
});

export const VideoProcessingRequestSchema = Type.Object({
    courseId: Type.Number({ minimum: 1 }),
    processingOptions: Type.Optional(Type.Object({
        resolutions: Type.Optional(Type.Array(Type.Union([
            Type.Literal('144p'),
            Type.Literal('240p'),
            Type.Literal('360p'),
            Type.Literal('480p'),
            Type.Literal('720p')
        ]))),
        format: Type.Optional(Type.Literal('mp4'))
    }))
});

export const VideoProcessingResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        videoJobId: Type.String(),
        vectorJobId: Type.String(),
        contentVectorJobId: Type.String(),
        status: Type.String(),
        message: Type.String()
    }),
    message: Type.String()
});

// Renamed schemas for upload endpoint
export const VideoUploadRequestSchema = Type.Object({
    courseId: Type.Number({ minimum: 1 }),
    moduleId: Type.Number({ minimum: 1 }),
    contentId: Type.Number({ minimum: 1 }),
    processingOptions: Type.Optional(Type.Object({
        resolutions: Type.Optional(Type.Array(Type.Union([
            Type.Literal('144p'),
            Type.Literal('240p'),
            Type.Literal('360p'),
            Type.Literal('480p'),
            Type.Literal('720p')
        ]))),
        format: Type.Optional(Type.Literal('mp4'))
    }))
});

export const VideoUploadResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        videoJobId: Type.String(),
        vectorJobId: Type.String(),
        contentVectorJobId: Type.String(),
        status: Type.String(),
        message: Type.String()
    }),
    message: Type.String()
});

export type Banners = Static<typeof Banners>;
export type Categories = Static<typeof Categories>;
export type HomePageContentResponse = Static<typeof HomePageContentResponseSchema>;
export type LoginPageContentResponse = Static<typeof LoginPageContentResponseSchema>;
export type UnifiedPresignedUrlRequest = Static<typeof UnifiedPresignedUrlRequestSchema>;
export type PresignedUrlResponse = Static<typeof PresignedUrlResponseSchema>;
export type VideoProcessingRequest = Static<typeof VideoProcessingRequestSchema>;
export type VideoProcessingResponse = Static<typeof VideoProcessingResponseSchema>;
export type VideoUploadRequest = Static<typeof VideoUploadRequestSchema>;
export type VideoUploadResponse = Static<typeof VideoUploadResponseSchema>;
