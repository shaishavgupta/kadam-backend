import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdminService } from '../service/admin.service';
import {
    LoginPageContentResponseSchema,
    HomePageContentResponseSchema,
    LoginPageContentResponse,
    HomePageContentResponse,
    Banners,
    Categories
} from '../schemas/media';
import { AdminConfigurations } from '../shared/types';
import { CoursesService } from '../service/courses.service';
import { authMiddleware, AuthenticatedRequest, requireUser } from '../shared/middleware/auth';

const adminService = new AdminService();
const coursesService = new CoursesService();

export default async function mediaRoutes(fastify: FastifyInstance) {

    fastify.get('/login-page-content', {
        schema: {
            tags: ['Media'],
            summary: 'Get login page content',
            description: 'Get background images and other content for the login page',
            response: {
                200: LoginPageContentResponseSchema
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply): Promise<LoginPageContentResponse> => {
        try {
            const background = await adminService.getConfiguration(AdminConfigurations.loginPageBackground)

            return {
                success: true,
                data: {
                    background: background?.value || []
                },
                message: "Login page content retrieved successfully"
            };
        } catch (error) {
            return reply.status(500).send({
                success: false,
                message: "Internal server error"
            });
        }
    });

    // Register protected routes with auth middleware
    fastify.register(async function (fastify) {
        fastify.addHook('preHandler', authMiddleware);
        fastify.addHook('preHandler', requireUser);

        fastify.get('/home-page-content', {
            schema: {
                tags: ['Media'],
                summary: 'Get home page content',
                description: 'Get banners and other content for the home page',
                security: [{ bearerAuth: [] }],
                response: {
                    200: HomePageContentResponseSchema
                }
            }
        }, async (request: AuthenticatedRequest, reply: FastifyReply): Promise<HomePageContentResponse> => {
            try {
                const banners = await adminService.getConfiguration(AdminConfigurations.homePageBanners)
                const categories = await adminService.getConfiguration(AdminConfigurations.homePagePopularCategories)

                return {
                    success: true,
                    data: {
                        banners: (banners?.value as Banners[]) || [],
                        categories: (categories?.value as Categories[]) || [],
                    },
                    message: "Home page content retrieved successfully"
                };
            } catch (error) {
                return reply.status(500).send({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
    });
}
