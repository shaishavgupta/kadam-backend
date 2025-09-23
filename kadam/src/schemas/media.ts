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

export type Banners = Static<typeof Banners>;
export type Categories = Static<typeof Categories>;
export type HomePageContentResponse = Static<typeof HomePageContentResponseSchema>;
export type LoginPageContentResponse = Static<typeof LoginPageContentResponseSchema>;
