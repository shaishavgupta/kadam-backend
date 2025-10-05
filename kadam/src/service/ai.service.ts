import { 
    chatFlow,
    sessionManagerExports
} from '../repository/ai';
import { 
    CourseRecommendationRequest, 
    ContentDiscoveryRequest, 
    SimilarContentRequest, 
    VectorReindexRequest, 
    ChatRequest 
} from '../schemas';

export class AIService {

    async chatFlow(request: ChatRequest) {
        try {
            const result = await chatFlow({
                message: request.message,
                type: request.type,
                userId: request.userId,
                sessionId: request.sessionId,
                newSession: request.newSession || false
            });
            
            return result;
        } catch (error) {
            console.error('Error in chat flow:', error);
            throw error;
        }
    }

    // Session management methods
    async getUserSessions(userId: string) {
        try {
            return await sessionManagerExports.chatDatabase.getUserSessions(userId);
        } catch (error) {
            console.error('Error getting user sessions:', error);
            throw error;
        }
    }

    async getSessionMessages(sessionId: string, limit?: number) {
        try {
            return await sessionManagerExports.chatDatabase.getSessionMessages(sessionId, limit);
        } catch (error) {
            console.error('Error getting session messages:', error);
            throw error;
        }
    }

    async deleteSession(sessionId: string) {
        try {
            await sessionManagerExports.chatDatabase.deleteSession(sessionId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting session:', error);
            throw error;
        }
    }

    async updateSessionTitle(sessionId: string, title: string) {
        try {
            await sessionManagerExports.chatDatabase.updateSessionTitle(sessionId, title);
            return { success: true };
        } catch (error) {
            console.error('Error updating session title:', error);
            throw error;
        }
    }

    async createNewSession(userId: string, title?: string) {
        try {
            const sessionId = `session_${userId}_${Date.now()}`;
            await sessionManagerExports.chatDatabase.createSession(sessionId, userId, title);
            return { sessionId, success: true };
        } catch (error) {
            console.error('Error creating new session:', error);
            throw error;
        }
    }
}
