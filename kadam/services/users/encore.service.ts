import { Service } from "encore.dev/service";

export default new Service("users");

// Export all controller functions to make them available as API endpoints
export * from "./controller";
