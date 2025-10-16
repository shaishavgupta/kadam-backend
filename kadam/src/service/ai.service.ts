import { 
    chatFlow,
    sessionManagerExports
} from '../repository/ai';
import {
    ChatRequest 
} from '../schemas';
import { ExpertRepository } from '../repository/experts.repository';

export class AIService {
    private expertRepository: ExpertRepository;

    constructor() {
        this.expertRepository = new ExpertRepository();
    }

    async chatFlow(request: ChatRequest & { userId: string }) {
        try {
            // Ensure userId and expertId are provided
            if (!request.userId) {
                throw new Error('User ID is required for chat flow');
            }

            if (!request.expertId) {
                throw new Error('Expert ID is required for chat flow');
            }

            // Validate expert exists and is active
            const expert = await this.expertRepository.getExpertById(request.expertId);
            if (!expert) {
                throw new Error(`Expert with ID '${request.expertId}' not found`);
            }

            if (!expert.is_active) {
                throw new Error(`Expert '${expert.name}' is currently inactive`);
            }
            
            const result = await chatFlow({
                message: request.message,
                type: request.type,
                userId: request.userId,
                sessionId: request.sessionId,
                newSession: request.newSession || false,
                expertId: request.expertId
            });
            
            return result;
        } catch (error) {
            console.error('Error in chat flow:', error);
            throw error;
        }
    }

    // Session management methods
    async getUserSessions(userId: string, expertId?: string) {
        try {
            return await sessionManagerExports.chatDatabase.getUserSessions(userId, expertId);
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

    async createNewSession(userId: string, expertId: number, title?: string) {
        try {
            if (!expertId) {
                throw new Error('Expert ID is required for session creation');
            }

            // Validate expert exists
            const expert = await this.expertRepository.getExpertById(expertId);
            if (!expert) {
                throw new Error(`Expert with ID '${expertId}' not found`);
            }

            const sessionId = `session_${userId}_${expertId}_${Date.now()}`;
            await sessionManagerExports.chatDatabase.createSession(sessionId, userId, title, expertId);
            return { sessionId, success: true };
        } catch (error) {
            console.error('Error creating new session:', error);
            throw error;
        }
    }
}
