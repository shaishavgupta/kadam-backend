import { authHandler } from "encore.dev/auth";
import { APIError, Header, Gateway } from "encore.dev/api";

interface AuthParams {
	authorization?: Header<"Authorization">;
	path?: Header<"path">;
}

export interface AuthData {
	userID: string;
	userType: 'user' | 'creator' | 'admin';
}

export const auth = authHandler<AuthParams, AuthData>(
	async (data) => {
		const token = data.authorization?.replace("Bearer ", "");
		if (!token) throw APIError.unauthenticated("missing token");

		const parts = token.split(".");
		const decode = (str: string) => JSON.parse(Buffer.from(str, "base64").toString("utf8"));
		const payload = decode(parts[1]);
		const userType = payload.userType;
		if (data.path?.includes("/admin/") && userType !== 'admin') {
			throw APIError.permissionDenied("not an admin");
		}
		if (data.path?.includes("/creator/") && userType !== 'creator') {
			throw APIError.permissionDenied("not an creator");
		}

		const userID = payload.sub;
		return { userType: userType, userID: userID };
	}
);

export const gateway = new Gateway({ authHandler: auth });
