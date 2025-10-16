import { db } from "../infra/db";
import { cache } from "../infra/cache";
import { expertPromptRegistry, ExpertPromptContext, ExpertPromptFunctionName } from "./ai/expert-prompts";

export interface ExpertAction {
  icon: string;
  label: string;
  prompt: string;
}

export interface Expert {
  id: number;
  name: string;
  title?: string;
  description?: string;
  avatar_url?: string;
  prompt_function_name: string;
  is_active: boolean;
  actions: ExpertAction[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateExpertRequest {
  name: string;
  title?: string;
  description?: string;
  avatar_url?: string;
  prompt_function_name: string;
  actions?: ExpertAction[];
  tags?: string[];
}

export interface UpdateExpertRequest {
  name?: string;
  title?: string;
  description?: string;
  avatar_url?: string;
  prompt_function_name?: string;
  is_active?: boolean;
  actions?: ExpertAction[];
  tags?: string[];
}

export class ExpertRepository {
  private transformDatabaseRow(row: any): Expert {
    return {
      id: row.id,
      name: row.name,
      title: row.title || undefined,
      description: row.description || undefined,
      avatar_url: row.avatar_url || undefined,
      prompt_function_name: row.prompt_function_name,
      is_active: row.is_active,
      actions: row.actions || [],
      tags: row.tags || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private validateExpertData(expertData: CreateExpertRequest | UpdateExpertRequest): string[] {
    const errors: string[] = [];

    if ('prompt_function_name' in expertData && expertData.prompt_function_name) {
      if (!(expertData.prompt_function_name in expertPromptRegistry)) {
        errors.push(`Prompt function '${expertData.prompt_function_name}' not found in registry`);
      }
    }

    return errors;
  }

  async getExpertById(id: number): Promise<Expert | null> {
    const cacheKey = `expert:${id}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await db.query(
      'SELECT * FROM experts WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const expert = this.transformDatabaseRow(result.rows[0]);
    await cache.set(cacheKey, expert, 300); // 5 minutes cache
    return expert;
  }

  async getAllActiveExperts(): Promise<Expert[]> {
    const cacheKey = 'experts:active';
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await db.query(
      'SELECT * FROM experts WHERE is_active = true ORDER BY name ASC'
    );

    const experts = result.rows.map(row => this.transformDatabaseRow(row));
    await cache.set(cacheKey, experts, 300); // 5 minutes cache
    return experts;
  }

  async getAllExperts(): Promise<Expert[]> {
    const result = await db.query(
      'SELECT * FROM experts ORDER BY name ASC'
    );

    return result.rows.map(row => this.transformDatabaseRow(row));
  }

  async createExpert(expertData: CreateExpertRequest): Promise<Expert> {
    const validationErrors = this.validateExpertData(expertData);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(", "));
    }

    // Note: We'll allow duplicate names since we're using ID as primary identifier

    const result = await db.query(
      `INSERT INTO experts (
        name, title, description, avatar_url, prompt_function_name, actions, tags, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *`,
      [
        expertData.name,
        expertData.title || null,
        expertData.description || null,
        expertData.avatar_url || null,
        expertData.prompt_function_name,
        JSON.stringify(expertData.actions || []),
        expertData.tags || []
      ]
    );

    const expert = this.transformDatabaseRow(result.rows[0]);
    
    // Clear caches
    await cache.delete('experts:active');
    await cache.delete(`expert:${expert.id}`);
    await cache.delete(`expert:${expert.id}`);
    
    return expert;
  }

  async updateExpert(id: number, expertData: UpdateExpertRequest): Promise<Expert> {
    const validationErrors = this.validateExpertData(expertData);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(", "));
    }

    const existingExpert = await this.getExpertById(id);
    if (!existingExpert) {
      throw new Error("Expert not found");
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (expertData.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      values.push(expertData.name);
      paramIndex++;
    }

    if (expertData.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      values.push(expertData.title);
      paramIndex++;
    }

    if (expertData.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(expertData.description);
      paramIndex++;
    }

    if (expertData.avatar_url !== undefined) {
      updateFields.push(`avatar_url = $${paramIndex}`);
      values.push(expertData.avatar_url);
      paramIndex++;
    }

    if (expertData.prompt_function_name !== undefined) {
      updateFields.push(`prompt_function_name = $${paramIndex}`);
      values.push(expertData.prompt_function_name);
      paramIndex++;
    }

    if (expertData.tags !== undefined) {
      updateFields.push(`tags = $${paramIndex}`);
      values.push(expertData.tags);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return existingExpert;
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE experts SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    const expert = this.transformDatabaseRow(result.rows[0]);
    
    // Clear caches
    await cache.delete('experts:active');
    await cache.delete(`expert:${expert.id}`);
    await cache.delete(`expert:${expert.id}`);
    
    return expert;
  }

  async deleteExpert(id: number): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM experts WHERE id = $1',
      [id]
    );

    // Clear caches
    await cache.delete('experts:active');
    await cache.delete(`expert:${id}`);

    return (result.rowCount || 0) > 0;
  }

  async getExpertPrompt(expertId: number, context: ExpertPromptContext): Promise<string> {
    const expert = await this.getExpertById(expertId);
    if (!expert) {
      throw new Error(`Expert with ID '${expertId}' not found`);
    }

    if (!expert.is_active) {
      throw new Error(`Expert '${expert.name}' is currently inactive`);
    }

    const promptFunction = expertPromptRegistry[expert.prompt_function_name as ExpertPromptFunctionName];
    if (!promptFunction) {
      throw new Error(`Prompt function '${expert.prompt_function_name}' not found`);
    }

    return promptFunction(context);
  }

  async getExpertStats(): Promise<{ total: number; active: number; inactive: number }> {
    const result = await db.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
       FROM experts`
    );

    return {
      total: parseInt(result.rows[0].total),
      active: parseInt(result.rows[0].active),
      inactive: parseInt(result.rows[0].inactive),
    };
  }
}
