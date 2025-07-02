// Collective Selection Components
export {
  CollectiveSelectionCard,
  CollectiveSelectionCardSkeleton,
} from './CollectiveSelectionCard';

export { CollectiveSelectionModal } from './CollectiveSelectionModal';

export { CollectiveSelectionSummary } from './CollectiveSelectionSummary';

export {
  CollectiveValidationFeedback,
  CompactCollectiveValidationFeedback,
} from './CollectiveValidationFeedback';

// Local type definition using proper generated database types
import { Database } from '@/lib/database.types';

export interface CollectiveWithPermission {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  user_role: Database['public']['Enums']['collective_member_role'];
  can_post: boolean;
  member_count?: number;
}
