'use client';

import {
  Search,
  Upload,
  Play,
  Edit,
  Trash2,
  Grid,
  List,
  BarChart3,
  AlertCircle,
  Loader2,
  Settings,
  Radio,
  ExternalLink,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/primitives/Button';
import { Card } from '@/components/primitives/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SECONDS_PER_MINUTE,
  PAD_LENGTH,
  PAD_CHARACTER,
} from '@/lib/constants/video';

// Constants
const REFRESH_INTERVAL_MS = 5000;
const VIDEOS_PER_PAGE = 20;
const VIDEO_ID_DISPLAY_LENGTH = 8;

// Types
interface VideoAsset {
  id: string;
  title: string | undefined;
  description: string | undefined;
  status: string | undefined;
  duration: number | undefined;
  aspect_ratio: string | undefined;
  created_at: string | undefined;
  updated_at: string | undefined;
  mux_asset_id: string;
  mux_playback_id: string | undefined;
  created_by: string | undefined;
}

interface ApiResponse {
  data: {
    videos: VideoAsset[];
    total: number;
  };
}

interface VideoRefreshResponse {
  video: VideoAsset;
}

// Helper functions
const formatDuration = (seconds?: number): string => {
  if (seconds === undefined || seconds === 0) return 'N/A';
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const remainingSeconds = Math.floor(seconds % SECONDS_PER_MINUTE);
  return `${minutes}:${remainingSeconds.toString().padStart(PAD_LENGTH, PAD_CHARACTER)}`;
};

// Enhanced StatusBadge component with design tokens
function StatusBadge({
  status,
}: {
  status: string | undefined;
}): React.ReactElement {
  const getStatusVariant = (
    status: string | undefined,
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'ready':
        return 'default';
      case 'preparing':
      case 'processing':
        return 'secondary';
      case 'errored':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string | undefined): string => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'preparing':
        return 'Preparing';
      case 'processing':
        return 'Processing';
      case 'errored':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <Badge variant={getStatusVariant(status)} className="micro-interaction">
      {getStatusLabel(status)}
    </Badge>
  );
}

export default function VideoManagementDashboard(): React.ReactElement {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('library');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch videos
  const fetchVideos = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(undefined);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: VIDEOS_PER_PAGE.toString(),
        search: searchQuery,
        status: statusFilter,
        sort: sortBy,
        order: sortOrder,
      });

      const response = await fetch(`/api/videos?${params}`);
      if (!response.ok) throw new Error('Failed to fetch videos');

      const result = (await response.json()) as ApiResponse;
      const videosData = result.data?.videos;
      if (Array.isArray(videosData)) {
        setVideos(videosData);
        const totalCount = result.data?.total ?? 0;
        setTotalPages(Math.ceil(totalCount / VIDEOS_PER_PAGE));
      } else {
        setVideos([]);
        setTotalPages(1);
      }
    } catch {
      setError('Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, sortBy, sortOrder]);

  // Automatic refresh for processing videos
  useEffect(() => {
    if (activeTab === 'library') {
      // Function to refresh processing videos
      const refreshProcessingVideos = async (): Promise<void> => {
        const processingVideos = videos.filter(
          (video): video is VideoAsset =>
            video.status === 'preparing' || video.status === 'processing',
        );

        if (processingVideos.length > 0) {
          console.warn(
            `Refreshing ${processingVideos.length} processing videos...`,
          );

          // Refresh each processing video
          const refreshPromises = processingVideos.map(
            async (video): Promise<VideoAsset | undefined> => {
              try {
                const response = await fetch(
                  `/api/videos/${video.id}/refresh`,
                  {
                    method: 'POST',
                  },
                );

                if (response.ok) {
                  const result =
                    (await response.json()) as VideoRefreshResponse;
                  return result.video;
                }
                return undefined;
              } catch (error: unknown) {
                console.error(`Failed to refresh video ${video.id}:`, error);
                return undefined;
              }
            },
          );

          const refreshedVideos = await Promise.all(refreshPromises);

          // Update the videos state with refreshed data
          setVideos((prevVideos) => {
            return prevVideos.map((video) => {
              const refreshedVideo = refreshedVideos.find(
                (refreshed): refreshed is VideoAsset =>
                  refreshed !== undefined && refreshed.id === video.id,
              );
              return refreshedVideo ?? video;
            });
          });
        }
      };

      // Initial refresh
      void refreshProcessingVideos();

      // Set up interval for automatic refresh
      const intervalId = setInterval(
        () => void refreshProcessingVideos(),
        REFRESH_INTERVAL_MS,
      );

      // Cleanup interval on unmount or when dependencies change
      return () => clearInterval(intervalId);
    }

    return undefined;
  }, [videos, activeTab]);

  // Fetch videos when component mounts or filters change
  useEffect(() => {
    if (activeTab === 'library') {
      void fetchVideos();
    }
  }, [activeTab, fetchVideos]);

  // Handle video selection
  const toggleVideoSelection = useCallback((videoId: string): void => {
    setSelectedVideos((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(videoId)) {
        newSelection.delete(videoId);
      } else {
        newSelection.add(videoId);
      }
      return newSelection;
    });
  }, []);

  const selectAllVideos = useCallback((): void => {
    setSelectedVideos((prev) => {
      if (prev.size === videos.length) {
        return new Set();
      } else {
        return new Set(videos.map((v) => v.id));
      }
    });
  }, [videos]);

  // Bulk operations
  const handleBulkDelete = useCallback(async (): Promise<void> => {
    if (selectedVideos.size === 0) return;

    // Log the delete action instead of showing confirm dialog
    console.warn(`Deleting ${selectedVideos.size} video(s)`);

    try {
      const deletePromises = Array.from(selectedVideos).map((videoId) =>
        fetch(`/api/videos/${videoId}`, { method: 'DELETE' }),
      );

      await Promise.all(deletePromises);
      setSelectedVideos(new Set());
      void fetchVideos();
    } catch {
      setError('Failed to delete videos');
    }
  }, [selectedVideos, fetchVideos]);

  const handleBulkDeleteClick = useCallback((): void => {
    void handleBulkDelete();
  }, [handleBulkDelete]);

  const handleFetchVideos = useCallback((): void => {
    void fetchVideos();
  }, [fetchVideos]);

  // Event handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  const handleStatusFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      setStatusFilter(e.target.value);
    },
    [],
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      setSortBy(e.target.value);
      setSortOrder('desc'); // Reset to desc when changing sort field
    },
    [],
  );

  const toggleViewMode = useCallback((): void => {
    setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'));
  }, []);

  const handleLiveStreamClick = useCallback((): void => {
    setActiveTab('live-streams');
  }, []);

  const handlePreviousPage = useCallback((): void => {
    setCurrentPage((prev) => prev - 1);
  }, []);

  const handleNextPage = useCallback((): void => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const handleToggleVideoSelection = useCallback(
    (videoId: string) => (): void => {
      toggleVideoSelection(videoId);
    },
    [toggleVideoSelection],
  );

  return (
    <div className="p-2 pattern-stack gap-section">
      {/* Enhanced Header with design tokens */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-component">
        <div className="flex items-center gap-component">
          <Button
            asChild
            leftIcon={<Upload className="h-4 w-4" />}
            className="micro-interaction btn-scale"
          >
            <Link href="/videos/upload">Upload Video</Link>
          </Button>
          <Button
            variant="outline"
            onClick={handleLiveStreamClick}
            leftIcon={<Radio className="h-4 w-4" />}
            className="micro-interaction nav-hover"
          >
            Go Live
          </Button>
        </div>
      </div>

      {/* Enhanced Error Alert */}
      {error !== undefined && error.length > 0 && (
        <Alert
          variant="destructive"
          className="pattern-card border-destructive"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-destructive">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-surface-elevated-2">
          <TabsTrigger
            value="library"
            className="flex items-center gap-1.5 micro-interaction nav-hover"
          >
            <Grid className="h-4 w-4" />
            Library
          </TabsTrigger>
          <TabsTrigger
            value="live-streams"
            className="flex items-center gap-1.5 micro-interaction nav-hover"
          >
            <Radio className="h-4 w-4" />
            Live
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex items-center gap-1.5 micro-interaction nav-hover"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex items-center gap-1.5 micro-interaction nav-hover"
          >
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Enhanced Video Library Tab */}
        <TabsContent value="library" className="pattern-stack gap-section">
          {/* Enhanced Library Controls */}
          <Card size="md" className="pattern-card">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-component">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-component">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-content-secondary" />
                  <Input
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-10 w-64 border-border-subtle focus:border-accent transition-colors transition-fast"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  className="px-3 py-2 border border-border-subtle rounded-md bg-surface-base text-content-primary micro-interaction focus:border-accent transition-colors transition-fast"
                >
                  <option value="all">All Status</option>
                  <option value="ready">Ready</option>
                  <option value="preparing">Preparing</option>
                  <option value="errored">Errored</option>
                </select>
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="px-3 py-2 border border-border-subtle rounded-md bg-surface-base text-content-primary micro-interaction focus:border-accent transition-colors transition-fast"
                >
                  <option value="created_at">Created Date</option>
                  <option value="title">Title</option>
                  <option value="duration">Duration</option>
                  <option value="view_count">Views</option>
                </select>
              </div>

              <div className="flex items-center gap-component">
                {selectedVideos.size > 0 && (
                  <div className="flex items-center gap-component">
                    <span className="text-sm text-content-secondary">
                      {selectedVideos.size} selected
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkDeleteClick}
                      leftIcon={<Trash2 className="h-4 w-4" />}
                      className="micro-interaction btn-scale"
                    >
                      Delete
                    </Button>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleViewMode}
                  className="micro-interaction nav-hover"
                  leftIcon={
                    viewMode === 'grid' ? (
                      <List className="h-4 w-4" />
                    ) : (
                      <Grid className="h-4 w-4" />
                    )
                  }
                />
              </div>
            </div>

            {/* Enhanced Bulk Selection */}
            {videos.length > 0 && (
              <div className="flex items-center gap-component pt-2">
                <input
                  type="checkbox"
                  checked={selectedVideos.size === videos.length}
                  onChange={selectAllVideos}
                  className="h-4 w-4 rounded accent-accent micro-interaction"
                />
                <span className="text-sm text-content-secondary">
                  Select all videos
                </span>
              </div>
            )}
          </Card>

          {/* Enhanced Video Grid/List with video-grid pattern */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-content-accent" />
            </div>
          ) : videos.length === 0 ? (
            <Card size="lg" className="pattern-card text-center">
              <div className="pattern-stack gap-component items-center">
                <p className="text-content-secondary">No videos found</p>
                <Button
                  asChild
                  leftIcon={<Upload className="h-4 w-4" />}
                  className="micro-interaction btn-scale"
                >
                  <Link href="/videos/upload">Upload Your First Video</Link>
                </Button>
              </div>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="video-grid">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  isSelected={selectedVideos.has(video.id)}
                  onSelect={handleToggleVideoSelection(video.id)}
                  onRefresh={handleFetchVideos}
                />
              ))}
            </div>
          ) : (
            <Card size="md" className="pattern-card overflow-hidden">
              <div className="divide-y divide-border-subtle">
                {videos.map((video) => (
                  <VideoListItem
                    key={video.id}
                    video={video}
                    isSelected={selectedVideos.has(video.id)}
                    onSelect={handleToggleVideoSelection(video.id)}
                    onRefresh={handleFetchVideos}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Enhanced Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-component">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={handlePreviousPage}
                className="micro-interaction nav-hover"
              >
                Previous
              </Button>
              <span className="text-sm text-content-secondary px-component">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={handleNextPage}
                className="micro-interaction nav-hover"
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="live-streams">
          <Card size="lg" className="pattern-card text-center">
            <div className="pattern-stack gap-component items-center">
              <Radio className="h-12 w-12 text-content-accent" />
              <h3 className="text-xl font-semibold text-content-primary">
                Live Streaming
              </h3>
              <p className="text-content-secondary">
                Live streaming features coming soon!
              </p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card size="lg" className="pattern-card text-center">
            <div className="pattern-stack gap-component items-center">
              <BarChart3 className="h-12 w-12 text-content-accent" />
              <h3 className="text-xl font-semibold text-content-primary">
                Video Analytics
              </h3>
              <p className="text-content-secondary">
                Analytics dashboard coming soon!
              </p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card size="lg" className="pattern-card text-center">
            <div className="pattern-stack gap-component items-center">
              <Settings className="h-12 w-12 text-content-accent" />
              <h3 className="text-xl font-semibold text-content-primary">
                Video Settings
              </h3>
              <p className="text-content-secondary">
                Settings panel coming soon!
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Enhanced VideoCard component with design tokens
interface VideoCardProps {
  video: VideoAsset;
  isSelected: boolean;
  onSelect: () => void;
  onRefresh: () => void;
}

const VideoCard = React.memo(function VideoCard({
  video,
  isSelected,
  onSelect,
  onRefresh,
}: VideoCardProps): React.ReactElement {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDelete = useCallback(async (): Promise<void> => {
    // Using console.warn instead of window.confirm for better UX
    console.warn('Delete video requested:', video.id);

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (error: unknown) {
      console.error('Failed to delete video:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [video.id, onRefresh]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    if (video.status !== 'preparing' && video.status !== 'processing') return;

    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/videos/${video.id}/refresh`, {
        method: 'POST',
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (error: unknown) {
      console.error('Failed to refresh video:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [video.id, video.status, onRefresh]);

  const handleDeleteClick = useCallback((): void => {
    void handleDelete();
  }, [handleDelete]);

  const handleRefreshClick = useCallback((): void => {
    void handleRefresh();
  }, [handleRefresh]);

  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>): void => {
      // If thumbnail fails, MUX is still processing - hide the broken image
      const target = e.currentTarget;
      target.style.display = 'none';
    },
    [],
  );

  const handleEditClick = useCallback((): void => {
    // Edit handler placeholder
    console.warn('Edit video:', video.id);
  }, [video.id]);

  return (
    <Card
      size="md"
      className={`pattern-card micro-interaction card-lift relative ${
        isSelected ? 'ring-2 ring-accent border-accent' : ''
      }`}
    >
      {/* Selection checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="h-4 w-4 rounded border-border-subtle accent-accent micro-interaction"
        />
      </div>

      {/* Video thumbnail */}
      <div className="relative aspect-video bg-surface-elevated-2 rounded-t-lg overflow-hidden">
        {video.mux_playback_id !== undefined &&
        video.mux_playback_id.length > 0 ? (
          <>
            <Image
              src={`https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?width=400&height=225&fit_mode=smartcrop&time=1`}
              alt={video.title ?? 'Video thumbnail'}
              fill
              className="object-cover transition-transform transition-normal hover:scale-105"
              onError={handleImageError}
            />
            {/* Play icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 bg-black/70 rounded-full flex items-center justify-center">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-content-secondary" />
          </div>
        )}

        {/* Duration overlay */}
        {video.duration !== undefined && video.duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {formatDuration(video.duration)}
          </div>
        )}
      </div>

      {/* Video info */}
      <div className="pattern-stack gap-component">
        <div className="pattern-stack gap-1">
          <h3 className="font-semibold text-content-primary truncate">
            {video.title !== undefined && video.title.length > 0
              ? video.title
              : `Video ${video.id.slice(0, VIDEO_ID_DISPLAY_LENGTH)}`}
          </h3>
          <StatusBadge status={video.status} />
        </div>

        {video.description !== undefined && video.description.length > 0 && (
          <p className="text-sm text-content-secondary line-clamp-2">
            {video.description}
          </p>
        )}

        <div className="text-xs text-content-secondary">
          Created:{' '}
          {video.created_at !== undefined && video.created_at.length > 0
            ? new Date(video.created_at).toLocaleDateString()
            : 'N/A'}
        </div>

        {/* Action buttons */}
        <div className="flex justify-between items-center pt-component border-t border-border-subtle">
          <div className="flex gap-1">
            {video.mux_playback_id !== undefined &&
              video.mux_playback_id.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="micro-interaction nav-hover"
                  asChild
                >
                  <Link href={`/videos/${video.id}`}>
                    <Play className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            <Button
              size="sm"
              variant="ghost"
              className="micro-interaction nav-hover"
              onClick={handleEditClick}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-1">
            {(video.status === 'preparing' ||
              video.status === 'processing') && (
              <Button
                size="sm"
                variant="outline"
                disabled={isRefreshing}
                onClick={handleRefreshClick}
                className="micro-interaction btn-scale"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteClick}
              className="micro-interaction btn-scale"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});

// Video List Item Component
const VideoListItem = React.memo(function VideoListItem({
  video,
  isSelected,
  onSelect,
  onRefresh,
}: VideoCardProps): React.ReactElement {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDelete = useCallback(async (): Promise<void> => {
    // Using console.warn instead of window.confirm for better UX
    console.warn('Delete video requested:', video.id);

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (error: unknown) {
      console.error('Failed to delete video:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [video.id, onRefresh]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    if (video.status !== 'preparing' && video.status !== 'processing') return;

    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/videos/${video.id}/refresh`, {
        method: 'POST',
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (error: unknown) {
      console.error('Failed to refresh video:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [video.id, video.status, onRefresh]);

  const handleDeleteClick = useCallback((): void => {
    void handleDelete();
  }, [handleDelete]);

  const handleRefreshClick = useCallback((): void => {
    void handleRefresh();
  }, [handleRefresh]);

  const handleEditClick = useCallback((): void => {
    // Edit handler placeholder
    console.warn('Edit video:', video.id);
  }, [video.id]);

  return (
    <div
      className={`flex items-center gap-component p-card-sm transition-colors transition-fast hover:bg-interaction-hover ${
        isSelected ? 'bg-interaction-focus' : ''
      }`}
    >
      {/* Selection checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onSelect}
        className="h-4 w-4 rounded border-border-subtle accent-accent micro-interaction"
      />

      {/* Video thumbnail */}
      <div className="relative w-24 h-14 bg-surface-elevated-2 rounded overflow-hidden flex-shrink-0">
        {video.mux_playback_id !== undefined &&
        video.mux_playback_id.length > 0 ? (
          <Image
            src={`https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?width=96&height=56&fit_mode=smartcrop&time=1`}
            alt={video.title ?? 'Video thumbnail'}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="h-6 w-6 text-content-secondary" />
          </div>
        )}
      </div>

      {/* Video details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-component">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-content-primary truncate">
              {video.title !== undefined && video.title.length > 0
                ? video.title
                : `Video ${video.id.slice(0, VIDEO_ID_DISPLAY_LENGTH)}`}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={video.status} />
              <span className="text-xs text-content-secondary">
                {formatDuration(video.duration)}
              </span>
              <span className="text-xs text-content-secondary">
                {video.created_at !== undefined && video.created_at.length > 0
                  ? new Date(video.created_at).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1 flex-shrink-0">
            {video.mux_playback_id !== undefined &&
              video.mux_playback_id.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="micro-interaction nav-hover"
                  asChild
                >
                  <Link href={`/videos/${video.id}`}>
                    <Play className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            <Button
              size="sm"
              variant="ghost"
              className="micro-interaction nav-hover"
              onClick={handleEditClick}
            >
              <Edit className="h-4 w-4" />
            </Button>
            {(video.status === 'preparing' ||
              video.status === 'processing') && (
              <Button
                size="sm"
                variant="outline"
                disabled={isRefreshing}
                onClick={handleRefreshClick}
                className="micro-interaction btn-scale"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteClick}
              className="micro-interaction btn-scale"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
