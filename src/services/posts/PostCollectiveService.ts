import { Database } from '@/lib/database.types';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
  PostCollectiveRow,
  PostCollectiveServiceResponse,
  PostCollectiveError,
  PostCollectiveValidationResult,
  canUserPostToCollective,
} from '@/types/enhanced-database.types';

import { postCollectiveAuditService } from './PostCollectiveAuditService';
import { postCollectiveErrorHandler } from './PostCollectiveErrorHandler';

type DBPostCollectiveInsert = Database['public']['Tables']['post_collectives']['Insert'];

// ---------------------------------------------------------------------------
// Constants & Utilities
// ---------------------------------------------------------------------------
/** Recent-error slice size returned by getServiceHealth */
const RECENT_ERROR_LIMIT = 10;

/**
 * Enhanced service class for managing post-collective associations
 * Integrates with audit logging and enhanced error handling
 */
export class PostCollectiveService {
  private supabase = createSupabaseBrowserClient();

  /**
   * Validate user permissions for posting to selected collectives
   * Enhanced with audit logging and performance tracking
   */
  validateCollectivePermissions(
    userId: string,
    collectiveIds: string[]
  ): Promise<PostCollectiveValidationResult> {
    return postCollectiveAuditService.trackPerformance(
      'validateCollectivePermissions',
      userId,
      async () => {
        const errors: PostCollectiveError[] = [];
        const warnings: Array<{ collective_id: string; collective_name: string; message: string }> = [];

        if (userId === '') {
          return {
            valid: false,
            errors: [{ type: 'validation' as const, message: 'User ID is required' }],
            warnings,
          };
        }

        if (collectiveIds.length === 0) {
          return {
            valid: false,
            errors: [{ type: 'validation' as const, message: 'At least one collective must be selected' }],
            warnings,
          };
        }

        // Fetch membership info
        const { data: memberships, error } = await this.supabase
          .from('collective_members')
          .select(
            `collective_id, role, collectives!inner(id,name,slug)`
          )
          .eq('member_id', userId)
          .eq('member_type', 'user')
          .in('collective_id', collectiveIds);

        if (error !== null && error !== undefined) {
          const dbError: PostCollectiveError = {
            type: 'database',
            message: `Failed to validate permissions: ${error.message}`,
          };
            postCollectiveAuditService.logOperation(
              'validateCollectivePermissions',
              '',
              collectiveIds,
              userId,
              false,
              dbError,
            );
          return { valid: false, errors: [dbError], warnings };
        }

        const membershipMap = new Map(
          (memberships ?? []).map((m) => [
            m.collective_id,
            {
              role: m.role,
              name: m.collectives.name,
            },
          ]),
        );

        for (const collectiveId of collectiveIds) {
          const membership = membershipMap.get(collectiveId);
          if (membership === undefined) {
            errors.push({
              type: 'permission',
              collective_id: collectiveId,
              message: 'You are not a member of this collective',
            });
            continue;
          }

          if (!canUserPostToCollective(membership.role)) {
            errors.push({
              type: 'permission',
              collective_id: collectiveId,
              collective_name: membership.name,
              message: `Insufficient permissions (role: ${membership.role})`,
            });
          }
        }

        const isValid = errors.length === 0;
        postCollectiveAuditService.logOperation(
          'validateCollectivePermissions',
          '',
          collectiveIds,
          userId,
          isValid,
          errors[0],
          {
            collective_count: collectiveIds.length,
            permission_errors: errors.length,
            warnings: warnings.length,
          },
        );

        return { valid: isValid, errors, warnings };
      },
      collectiveIds.length
    );
  }

  /**
   * Create post-collective associations with enhanced error handling and retry logic
   */
  createPostCollectiveAssociations(
    postId: string,
    userId: string,
    collectiveIds: string[],
    sharingSettings?: Record<
      string,
      {
        status?: PostCollectiveRow['status'];
        metadata?: PostCollectiveRow['metadata'];
        display_order?: number;
      }
    >
  ): Promise<PostCollectiveServiceResponse> {
    return postCollectiveErrorHandler.executeWithRetry(
      'createPostCollectiveAssociations',
      () =>
        postCollectiveAuditService.trackPerformance(
          'createPostCollectiveAssociations',
          userId,
          async () => {
            // First validate permissions
            const validation = await this.validateCollectivePermissions(userId, collectiveIds);
            if (!validation.valid) {
              const response: PostCollectiveServiceResponse = {
                success: false,
                errors: validation.errors.map(err => ({
                  collective_id: err.collective_id ?? '',
                  collective_name: err.collective_name ?? '',
                  error: err.message
                }))
              };

              postCollectiveAuditService.logOperation(
                'createPostCollectiveAssociations',
                postId,
                collectiveIds,
                userId,
                false,
                validation.errors[0],
                { validation_failed: true }
              );

              return response;
            }

            try {
              // Prepare post-collective associations
              const associations: DBPostCollectiveInsert[] = collectiveIds.map((collectiveId, index) => ({
                post_id: postId,
                collective_id: collectiveId,
                shared_by: userId,
                status: sharingSettings?.[collectiveId]?.status ?? 'published',
                metadata: sharingSettings?.[collectiveId]?.metadata ?? {},
                display_order: sharingSettings?.[collectiveId]?.display_order ?? index,
              }));

              // Insert associations into post_collectives table
              const { data: createdAssociations, error } = await this.supabase
                .from('post_collectives')
                .insert(associations)
                .select();

              if (error !== null && error !== undefined) {
                console.error('Error creating post-collective associations:', error);
                
                const dbError: PostCollectiveError = {
                  type: 'database',
                  message: `Database error: ${error.message}`
                };
                postCollectiveAuditService.logOperation(
                  'createPostCollectiveAssociations',
                  postId,
                  collectiveIds,
                  userId,
                  false,
                  dbError,
                  { database_error_code: error.code }
                );

                return {
                  success: false,
                  errors: [{
                    collective_id: '',
                    collective_name: '',
                    error: `Database error: ${error.message}`
                  }]
                };
              }

              // Log successful operation
              postCollectiveAuditService.logOperation(
                'createPostCollectiveAssociations',
                postId,
                collectiveIds,
                userId,
                true,
                undefined,
                {
                  associations_created: associations.length,
                  sharing_settings_provided: sharingSettings !== undefined && sharingSettings !== null
                }
              );

              return {
                success: true,
                post_id: postId,
                collective_associations: createdAssociations ?? []
              };

            } catch (error) {
              console.error('Error in createPostCollectiveAssociations:', error);
              
              const unexpectedError: PostCollectiveError = {
                type: 'database',
                message: 'Unexpected error creating collective associations'
              };
              postCollectiveAuditService.logOperation(
                'createPostCollectiveAssociations',
                postId,
                collectiveIds,
                userId,
                false,
                unexpectedError,
                { unexpected_error: String(error) }
              );

              return {
                success: false,
                errors: [{
                  collective_id: '',
                  collective_name: '',
                  error: 'Unexpected error creating collective associations'
                }]
              };
            }
          },
          collectiveIds.length
        ),
      {
        user_id: userId,
        post_id: postId,
        collective_ids: collectiveIds,
      },
    );
  }

  /**
   * Update post-collective associations
   */
  async updatePostCollectiveAssociations(
    postId: string,
    userId: string,
    newCollectiveIds: string[],
    sharingSettings?: Record<
      string,
      {
        status?: PostCollectiveRow['status'];
        metadata?: PostCollectiveRow['metadata'];
        display_order?: number;
      }
    >
  ): Promise<PostCollectiveServiceResponse> {
    try {
      // Get existing associations
      const { data: existingAssociations, error: fetchError } = await this.supabase
        .from('post_collectives')
        .select('*')
        .eq('post_id', postId);

      if (fetchError !== null && fetchError !== undefined) {
        return {
          success: false,
          errors: [{
            collective_id: '',
            collective_name: '',
            error: `Failed to fetch existing associations: ${fetchError.message}`
          }]
        };
      }

      const existingCollectiveIds = new Set(
        (existingAssociations ?? []).map(assoc => assoc.collective_id)
      );

      // Determine what to add and remove
      const collectivesToAdd = newCollectiveIds.filter(id => !existingCollectiveIds.has(id));
      const collectivesToRemove = [...existingCollectiveIds].filter(id => !newCollectiveIds.includes(id));

      // Validate permissions for new collectives
      if (collectivesToAdd.length !== 0) {
        const validation = await this.validateCollectivePermissions(userId, collectivesToAdd);
        if (!validation.valid) {
          return {
            success: false,
            errors: validation.errors.map(err => ({
              collective_id: err.collective_id ?? '',
              collective_name: err.collective_name ?? '',
              error: err.message
            }))
          };
        }
      }

      // Remove old associations
      if (collectivesToRemove.length !== 0) {
        const { error } = await this.supabase
          .from('post_collectives')
          .delete()
          .eq('post_id', postId)
          .in('collective_id', collectivesToRemove)
          .select();

        if (error !== null && error !== undefined) {
          console.error('Error removing collective associations:', error);
        }
      }

      // Add new associations
      if (collectivesToAdd.length !== 0) {
        const newAssociations: DBPostCollectiveInsert[] = collectivesToAdd.map((collectiveId, index) => ({
          post_id: postId,
          collective_id: collectiveId,
          shared_by: userId,
          status: sharingSettings?.[collectiveId]?.status ?? 'published',
          metadata: sharingSettings?.[collectiveId]?.metadata ?? {},
          display_order: sharingSettings?.[collectiveId]?.display_order ?? index,
        }));

        const { error: insertError } = await this.supabase
          .from('post_collectives')
          .insert(newAssociations)
          .select();

        if (insertError !== null && insertError !== undefined) {
          console.error('Error adding collective associations:', insertError);
          return {
            success: false,
            errors: [{
              collective_id: '',
              collective_name: '',
              error: `Failed to add new associations: ${insertError.message}`
            }]
          };
        }
      }

      // Fetch updated associations
      const { data: updatedAssociations } = await this.supabase
        .from('post_collectives')
        .select('*')
        .eq('post_id', postId);

      return {
        success: true,
        post_id: postId,
        collective_associations: updatedAssociations ?? []
      };

    } catch (error) {
      console.error('Error in updatePostCollectiveAssociations:', error);
      return {
        success: false,
        errors: [{
          collective_id: '',
          collective_name: '',
          error: 'Unexpected error updating collective associations'
        }]
      };
    }
  }

  /**
   * Get post-collective associations for a post
   */
  async getPostCollectiveAssociations(postId: string): Promise<PostCollectiveRow[]> {
    try {
      const { data: associations, error } = await this.supabase
        .from('post_collectives')
        .select('*')
        .eq('post_id', postId)
        .order('display_order');

      if (error !== null && error !== undefined) {
        console.error('Error fetching post-collective associations:', error);
        return [];
      }

      return associations ?? [];

    } catch (error) {
      console.error('Error in getPostCollectiveAssociations:', error);
      return [];
    }
  }

  /**
   * Remove post from specific collectives
   */
  async removePostFromCollectives(
    postId: string,
    collectiveIds: string[]
  ): Promise<PostCollectiveServiceResponse> {
    try {
      const { error } = await this.supabase
        .from('post_collectives')
        .delete()
        .eq('post_id', postId)
        .in('collective_id', collectiveIds)
        .select();

      if (error !== null && error !== undefined) {
        return {
          success: false,
          errors: [{
            collective_id: '',
            collective_name: '',
            error: `Failed to remove post from collectives: ${error.message}`
          }]
        };
      }

      return {
        success: true,
        post_id: postId
      };

    } catch (error) {
      console.error('Error in removePostFromCollectives:', error);
      return {
        success: false,
        errors: [{
          collective_id: '',
          collective_name: '',
          error: 'Unexpected error removing post from collectives'
        }]
      };
    }
  }

  /**
   * Migrate legacy single-collective post to multi-collective system
   * This helps with backward compatibility during the transition
   */
  async migrateLegacyPostCollective(
    postId: string,
    legacyCollectiveId: string | null,
    userId: string
  ): Promise<PostCollectiveServiceResponse> {
    if (legacyCollectiveId === null || legacyCollectiveId === undefined || legacyCollectiveId === '') {
      return { success: true, post_id: postId };
    }

    // Check if association already exists
    const existingAssociations = await this.getPostCollectiveAssociations(postId);
    const hasAssociation = existingAssociations.some(
      assoc => assoc.collective_id === legacyCollectiveId
    );

    if (hasAssociation) {
      return { success: true, post_id: postId };
    }

    // Create the association
    return this.createPostCollectiveAssociations(
      postId,
      userId,
      [legacyCollectiveId]
    );
  }

  /**
   * Get service health status and metrics
   */
  getServiceHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    metrics: Record<string, unknown>;
    errors: Record<string, unknown>;
  }> {
    const performanceMetrics = postCollectiveAuditService.getPerformanceMetrics();
    const errorStats = postCollectiveErrorHandler.getErrorStatistics();
    const systemHealth = postCollectiveAuditService.checkSystemHealth();

    return {
      status: systemHealth.status,
      metrics: {
        performance: performanceMetrics,
        audit: {
          local_logs: postCollectiveAuditService.getLocalLogs().length,
          export_available: true
        }
      },
      errors: {
        statistics: errorStats,
        recent_errors: postCollectiveErrorHandler.getRecentErrors({ limit: RECENT_ERROR_LIMIT }),
        system_health: systemHealth
      }
    };
  }
}

// Export singleton instance
export const postCollectiveService = new PostCollectiveService(); 