import { Static, Type } from "@sinclair/typebox";

export const Banners = Type.Object({
    image_url: Type.String(),
    redirect_url: Type.String(),
    is_active: Type.Boolean()
});

export const Categories = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    image_url: Type.String(),
    priority: Type.Number()
});

export const HomePageContentResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        banners: Type.Array(Banners),
        categories: Type.Array(Categories),
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

export const PresignedUrlRequestSchema = Type.Object({
    fileName: Type.String({ minLength: 1 }),
    contentType: Type.String({ minLength: 1 }),
    courseId: Type.Number({ minimum: 1 }),
    fileType: Type.Union([
        Type.Literal('raw-video'),
        Type.Literal('processed-video'),
        Type.Literal('thumbnail'),
        Type.Literal('certificate'),
        Type.Literal('course-material')
    ])
});

export const PresignedUrlResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
        presignedUrl: Type.String(),
        fileKey: Type.String(),
        expiresIn: Type.Number()
    }),
    message: Type.String()
});

export const VideoProcessingRequestSchema = Type.Object({
    courseId: Type.Number({ minimum: 1 }),
    processingOptions: Type.Object({
        quality: Type.Union([
            Type.Literal('240p'),
            Type.Literal('360p'),
            Type.Literal('480p'),
            Type.Literal('720p')
        ]),
        format: Type.Literal('mp4')
    })
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

export type Banners = Static<typeof Banners>;
export type Categories = Static<typeof Categories>;
export type HomePageContentResponse = Static<typeof HomePageContentResponseSchema>;
export type LoginPageContentResponse = Static<typeof LoginPageContentResponseSchema>;
export type PresignedUrlRequest = Static<typeof PresignedUrlRequestSchema>;
export type PresignedUrlResponse = Static<typeof PresignedUrlResponseSchema>;
export type VideoProcessingRequest = Static<typeof VideoProcessingRequestSchema>;
export type VideoProcessingResponse = Static<typeof VideoProcessingResponseSchema>;
