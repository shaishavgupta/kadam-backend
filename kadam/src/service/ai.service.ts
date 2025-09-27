import { 
    courseRecommendationFlow, 
    contentDiscoveryFlow, 
    similarContentFlow, 
    vectorReindexFlow, 
    chatFlow 
} from '../repository/ai.repository';
import { 
    CourseRecommendationRequest, 
    ContentDiscoveryRequest, 
    SimilarContentRequest, 
    VectorReindexRequest, 
    ChatRequest 
} from '../schemas';

export class AIService {
    
    async courseRecommendationFlow(request: CourseRecommendationRequest) {
        try {
            const result = await courseRecommendationFlow({
                userQuery: request.userQuery,
                categoryId: request.categoryId ? BigInt(request.categoryId) : undefined
            });
            
            return result;
        } catch (error) {
            console.error('Error in course recommendation flow:', error);
            throw error;
        }
    }

    async contentDiscoveryFlow(request: ContentDiscoveryRequest) {
        try {
            const result = await contentDiscoveryFlow({
                courseId: BigInt(request.courseId),
                contentType: request.contentType
            });
            
            return result;
        } catch (error) {
            console.error('Error in content discovery flow:', error);
            throw error;
        }
    }

    async similarContentFlow(request: SimilarContentRequest) {
        try {
            const result = await similarContentFlow({
                query: request.query,
                source: request.source
            });
            
            return result;
        } catch (error) {
            console.error('Error in similar content flow:', error);
            throw error;
        }
    }

    async vectorReindexFlow(request: VectorReindexRequest) {
        try {
            const result = await vectorReindexFlow({
                source: request.source,
                batchSize: request.batchSize
            });
            
            return result;
        } catch (error) {
            console.error('Error in vector reindex flow:', error);
            throw error;
        }
    }

    async chatFlow(request: ChatRequest) {
        try {
            const result = await chatFlow({
                message: request.message,
                type: request.type,
                userId: request.userId
            });
            
            return result;
        } catch (error) {
            console.error('Error in chat flow:', error);
            throw error;
        }
    }
}
