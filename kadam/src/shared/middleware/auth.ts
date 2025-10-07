import jwt from 'jsonwebtoken';
import { FastifyRequest, FastifyReply } from 'fastify';
import { authConfig } from '../../config';
import { Language } from '../enums';

export interface AuthData {
	userID: string;
	userType: 'user' | 'creator' | 'admin';
	language: Language;
}

export interface AuthenticatedRequest extends FastifyRequest {
	user?: AuthData;
}

export const authMiddleware = async (request: AuthenticatedRequest, reply: FastifyReply) => {
	try {
		const authHeader = request.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return reply.status(401).send({
				success: false,
				message: 'Missing or invalid authorization header'
			});
		}

		const token = authHeader.substring(7); // Remove 'Bearer ' prefix

		if (!authConfig.JWT_SECRET) {
			return reply.status(500).send({
				success: false,
				message: 'JWT secret not configured'
			});
		}

		const decoded = jwt.verify(token, authConfig.JWT_SECRET) as any;

		if (!decoded.sub || !decoded.userType || !decoded.language) {
			return reply.status(401).send({
				success: false,
				message: 'Invalid token payload'
			});
		}

		request.user = {
			userID: decoded.sub,
			userType: decoded.userType,
			language: decoded.language
		};
	} catch (error) {
		if (error instanceof jwt.JsonWebTokenError) {
			return reply.status(401).send({
				success: false,
				message: 'Invalid token'
			});
		} else {
			return reply.status(500).send({
				success: false,
				message: 'Internal server error'
			});
		}
	}
};

export const requireAdmin = async (request: AuthenticatedRequest, reply: FastifyReply) => {
	if (!request.user || request.user.userType !== 'admin') {
		return reply.status(403).send({
			success: false,
			message: 'Admin access required'
		});
	}
};

export const requireCreator = async (request: AuthenticatedRequest, reply: FastifyReply) => {
	if (!request.user || (request.user.userType !== 'creator' && request.user.userType !== 'admin')) {
		return reply.status(403).send({
			success: false,
			message: 'Creator access required'
		});
	}
};

export const requireUser = async (request: AuthenticatedRequest, reply: FastifyReply) => {
	if (!request.user || (request.user.userType !== 'user' && request.user.userType !== 'admin')) {
		return reply.status(403).send({
			success: false,
			message: 'User access required'
		});
	}
};
