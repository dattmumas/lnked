'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import Image from 'next/image';

// Import our components
import VideoUploader from '@/components/app/uploads/VideoUploader';
import MuxVideoPlayer from '@/components/app/video/MuxVideoPlayer';
import Link from 'next/link';

// Import constants
import {
  SECONDS_PER_MINUTE,
  PAD_LENGTH,
  PAD_CHARACTER,
  VIDEOS_PER_PAGE,
} from '@/lib/constants/video';

// Types
interface VideoAsset {
  id: string;
  title: string | null;
  description: string | null;
  status: string | null;
  duration: number | null;
  aspect_ratio: string | null;
  created_at: string | null;
  updated_at: string | null;
  mux_asset_id: string;
  mux_playback_id: string | null;
  created_by: string | null;
}

// Helper functions
const formatDuration = (seconds?: number) => {
  if (!seconds) return 'N/A';
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const remainingSeconds = Math.floor(seconds % SECONDS_PER_MINUTE);
  return `${minutes}:${remainingSeconds.toString().padStart(PAD_LENGTH, PAD_CHARACTER)}`;
};

// StatusBadge component
function StatusBadge({ status }: { status: string | null }) {
  const getStatusVariant = (status: string | null) => {
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

  const getStatusLabel = (status: string | null) => {
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
    <Badge variant={getStatusVariant(status)}>{getStatusLabel(status)}</Badge>
  );
}

export default function VideoManagementDashboard() {
  // State management
  const [activeTab, setActiveTab] = useState('library');
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch videos
  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: VIDEOS_PER_PAGE.toString(),
        search: searchQuery,
        sort: sortBy,
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/videos?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const result = await response.json();
      setVideos(result.data.videos);
      setTotalPages(Math.ceil(result.data.total / VIDEOS_PER_PAGE));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to fetch videos',
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, sortBy]);

  // Load data on mount and tab change
  useEffect(() => {
    if (activeTab === 'library') {
      fetchVideos();
    }
  }, [activeTab, fetchVideos]);

  // Handle video selection
  const toggleVideoSelection = (videoId: string) => {
    const newSelection = new Set(selectedVideos);
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      newSelection.add(videoId);
    }
    setSelectedVideos(newSelection);
  };

  const selectAllVideos = () => {
    if (selectedVideos.size === videos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(videos.map((v) => v.id)));
    }
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedVideos.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedVideos.size} video(s)?`,
    );
    if (!confirmed) return;

    try {
      const deletePromises = Array.from(selectedVideos).map((videoId) =>
        fetch(`/api/videos/${videoId}`, { method: 'DELETE' }),
      );

      await Promise.all(deletePromises);
      setSelectedVideos(new Set());
      fetchVideos();
    } catch {
      setError('Failed to delete videos');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Video Management</h1>
          <p className="text-muted-foreground">
            Manage your video library, live streams, and analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setActiveTab('upload')}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Video
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab('live-streams')}
          >
            <Radio className="h-4 w-4 mr-2" />
            Go Live
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="library">
            <Grid className="h-4 w-4 mr-2" />
            Library
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="live-streams">
            <Radio className="h-4 w-4 mr-2" />
            Live Streams
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Video Library Tab */}
        <TabsContent value="library" className="space-y-6">
          {/* Library Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="ready">Ready</option>
                <option value="preparing">Preparing</option>
                <option value="errored">Errored</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="created_at">Created Date</option>
                <option value="title">Title</option>
                <option value="duration">Duration</option>
                <option value="view_count">Views</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              {selectedVideos.size > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedVideos.size} selected
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setViewMode(viewMode === 'grid' ? 'list' : 'grid')
                }
              >
                {viewMode === 'grid' ? (
                  <List className="h-4 w-4" />
                ) : (
                  <Grid className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Bulk Selection */}
          {videos.length > 0 && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedVideos.size === videos.length}
                onChange={selectAllVideos}
                className="mt-1 h-4 w-4 rounded"
              />
              <span className="text-sm">Select all videos</span>
            </div>
          )}

          {/* Video Grid/List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No videos found</p>
              <Button className="mt-4" onClick={() => setActiveTab('upload')}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Video
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  isSelected={selectedVideos.has(video.id)}
                  onSelect={(videoId) => toggleVideoSelection(videoId)}
                  onRefresh={fetchVideos}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {videos.map((video) => (
                <VideoListItem
                  key={video.id}
                  video={video}
                  isSelected={selectedVideos.has(video.id)}
                  onSelect={(videoId) => toggleVideoSelection(videoId)}
                  onRefresh={fetchVideos}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <VideoUploader
                onUploadComplete={(session) => {
                  console.warn('Upload completed:', session);
                  setActiveTab('library');
                  fetchVideos();
                }}
                onUploadError={(error) => {
                  setError(error);
                }}
                maxFiles={10}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Streams Tab */}
        <TabsContent value="live-streams" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Live Streaming with MUX</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Radio className="h-5 w-5 mr-2" />
                MUX Live Streaming
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">
                  🔴 Live Streaming Features
                </h3>
                <p className="text-red-800 text-sm mb-3">
                  MUX provides powerful live streaming capabilities with
                  low-latency delivery, automatic scaling, and global CDN
                  distribution.
                </p>
                <div className="space-y-2 text-sm">
                  <h4 className="font-medium text-red-900">Key Features:</h4>
                  <ul className="text-red-800 space-y-1 ml-4">
                    <li>
                      • <strong>Low-Latency Streaming</strong> - Real-time
                      interaction
                    </li>
                    <li>
                      • <strong>Automatic Scaling</strong> - Handle any audience
                      size
                    </li>
                    <li>
                      • <strong>Global CDN</strong> - Worldwide content delivery
                    </li>
                    <li>
                      • <strong>Stream Recording</strong> - Automatically save
                      streams as VOD
                    </li>
                    <li>
                      • <strong>Real-time Analytics</strong> - Monitor stream
                      performance
                    </li>
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">📚 Getting Started</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Follow MUX's comprehensive live streaming guide
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href="https://docs.mux.com/guides/video/create-live-streams"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Live Streaming Guide
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">🛠️ API Reference</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Detailed API documentation for live stream management
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href="https://docs.mux.com/api-reference/video#live-streams"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        API Documentation
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">🚀 Implementation Steps</h4>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong>1.</strong> Create live stream via MUX API
                  </p>
                  <p>
                    <strong>2.</strong> Configure stream settings (latency,
                    recording, etc.)
                  </p>
                  <p>
                    <strong>3.</strong> Use RTMP endpoint to broadcast from
                    OBS/encoder
                  </p>
                  <p>
                    <strong>4.</strong> Embed MUX Player for viewers
                  </p>
                  <p>
                    <strong>5.</strong> Monitor with MUX Data analytics
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> Live streaming features will be
                  implemented following MUX's official documentation patterns.
                  This ensures optimal performance and reliability.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Video Analytics with MUX Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  📊 MUX Data Analytics
                </h3>
                <p className="text-blue-800 text-sm mb-3">
                  MUX provides comprehensive video analytics through{' '}
                  <strong>MUX Data</strong>. Get detailed insights into video
                  performance, viewer engagement, and quality metrics.
                </p>
                <div className="space-y-2 text-sm">
                  <h4 className="font-medium text-blue-900">
                    Available Metrics:
                  </h4>
                  <ul className="text-blue-800 space-y-1 ml-4">
                    <li>
                      • <strong>Views & Watch Time</strong> - Total plays and
                      engagement
                    </li>
                    <li>
                      • <strong>Quality of Experience</strong> - Startup time,
                      rebuffering, errors
                    </li>
                    <li>
                      • <strong>Audience Insights</strong> - Geographic
                      distribution, devices
                    </li>
                    <li>
                      • <strong>Real-time Monitoring</strong> - Live performance
                      tracking
                    </li>
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">🚀 Getting Started</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Follow MUX's official documentation to implement analytics
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href="https://docs.mux.com/guides/data/get-started-mux-data"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View MUX Data Guide
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">📈 Dashboard Access</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Access your video analytics directly in the MUX Dashboard
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href="https://dashboard.mux.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open MUX Dashboard
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">
                  🔧 Implementation Options
                </h4>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong>Option 1:</strong> Use MUX Dashboard for analytics
                    (recommended for most use cases)
                  </p>
                  <p>
                    <strong>Option 2:</strong> Integrate MUX Data API for custom
                    analytics dashboards
                  </p>
                  <p>
                    <strong>Option 3:</strong> Use MUX Player SDK for real-time
                    analytics tracking
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <Card>
            <CardHeader>
              <CardTitle>Video Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configure default video settings, encoding preferences, and
                more.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Video Card Component
interface VideoCardProps {
  video: VideoAsset;
  isSelected: boolean;
  onSelect: (videoId: string) => void;
  onRefresh: () => void;
}

function VideoCard({ video, isSelected, onSelect, onRefresh }: VideoCardProps) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation(); // Prevent card click
    if (!window.confirm('Are you sure you want to delete this video?')) return;

    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  };

  const handleRefreshStatus = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation(); // Prevent card click
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/videos/${video.id}/refresh`, {
        method: 'POST',
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to refresh video status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation(); // Prevent card click
    onSelect(video.id);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation(); // Prevent card click
    setShowPlayer(!showPlayer);
  };

  const playbackId = video.mux_playback_id;
  const isReady = video.status === 'ready' && playbackId;
  const isPreparing = video.status === 'preparing';

  return (
    <Link href={`/videos/${video.id}`} className="block">
      <Card className="group hover:shadow-lg transition-all cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              className="mt-1 h-4 w-4 rounded"
            />
            <div className="flex-1">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3 relative">
                {showPlayer && playbackId ? (
                  <MuxVideoPlayer
                    playbackId={playbackId}
                    title={video.title || 'Untitled Video'}
                    viewerUserId="current-user"
                    videoId={video.id}
                    enableAnalytics
                    className="rounded-t-lg"
                  />
                ) : (
                  <>
                    {playbackId ? (
                      <Image
                        src={`https://image.mux.com/${playbackId}/thumbnail.png?width=640&height=360`}
                        alt={video.title || 'Video thumbnail'}
                        className="w-full h-full object-cover"
                        width={640}
                        height={360}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <div className="text-center">
                          <Play className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            {video.status === 'preparing'
                              ? 'Processing...'
                              : 'No preview'}
                          </p>
                        </div>
                      </div>
                    )}
                    {isReady && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                        onClick={handlePlayClick}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Hover overlay with link hint */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                      <ExternalLink className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </>
                )}
              </div>

              <h3 className="font-medium text-lg mb-1">
                {video.title || 'Untitled Video'}
              </h3>
              {video.description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {video.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <StatusBadge status={video.status} />
                <div className="flex gap-1">
                  {isPreparing && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleRefreshStatus}
                      disabled={isRefreshing}
                      title="Refresh status"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                      />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleDelete}
                    title="Delete video"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Video List Item Component
function VideoListItem({
  video,
  isSelected,
  onSelect,
  onRefresh,
}: VideoCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/videos/${video.id}/refresh`, {
        method: 'POST',
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to refresh video status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;

    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  };

  const isReady = video.status === 'ready' && video.mux_playback_id;
  const isPreparing = video.status === 'preparing';

  return (
    <Card className={`${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(video.id);
            }}
            className="mt-1 h-4 w-4 rounded"
          />
          <div
            className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isReady) {
                window.open(`/videos/${video.id}`, '_blank');
              }
            }}
          >
            <Play className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{video.title || 'Untitled Video'}</h3>
            <p className="text-sm text-muted-foreground">
              {video.description || 'No description'}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDuration(video.duration ?? undefined)}
          </div>
          <div className="flex items-center space-x-2">
            <StatusBadge status={video.status} />
            {isPreparing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
                title="Refresh status from MUX"
              >
                <RefreshCw
                  className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {isReady ? (
              <Link href={`/videos/${video.id}`} target="_blank">
                <Button size="sm" variant="ghost">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled={!video.mux_playback_id}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost">
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
