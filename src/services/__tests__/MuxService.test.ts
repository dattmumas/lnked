import { MuxService, muxService } from '../MuxService';

// Mock the MUX SDK
jest.mock('@mux/mux-node', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      video: {
        assets: {
          create: jest.fn(),
          retrieve: jest.fn(),
          delete: jest.fn(),
          list: jest.fn(),
          createPlaybackId: jest.fn(),
        },
        liveStreams: {
          create: jest.fn(),
          delete: jest.fn(),
        },
        uploads: {
          create: jest.fn(),
        },
      },
    })),
  };
});

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetAllMocks();
  process.env = {
    ...originalEnv,
    MUX_TOKEN_ID: 'test_token_id',
    MUX_TOKEN_SECRET: 'test_token_secret',
    MUX_WEBHOOK_SECRET: 'test_webhook_secret',
    NODE_ENV: 'test',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('MuxService', () => {
  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MuxService.getInstance();
      const instance2 = MuxService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should be the same as the exported muxService', () => {
      const instance = MuxService.getInstance();
      expect(instance).toBe(muxService);
    });
  });

  describe('Initialization', () => {
    it('should throw error when credentials are missing', () => {
      delete process.env.MUX_TOKEN_ID;
      delete process.env.MUX_TOKEN_SECRET;

      expect(() => {
        // Force new instance creation by clearing the singleton
        (MuxService as any).instance = undefined;
        MuxService.getInstance();
      }).toThrow('MUX credentials not found in environment variables');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when MUX API is accessible', async () => {
      const mockList = jest.fn().mockResolvedValue({ data: [] });
      (muxService as any).mux.video.assets.list = mockList;

      const result = await muxService.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        status: 'healthy',
        environment: 'test',
      });
      expect(mockList).toHaveBeenCalledWith({ limit: 1 });
    });

    it('should return error when MUX API is not accessible', async () => {
      const mockList = jest.fn().mockRejectedValue(new Error('API Error'));
      (muxService as any).mux.video.assets.list = mockList;

      const result = await muxService.healthCheck();

      expect(result.success).toBe(false);
      expect(result.error).toBe('MUX service health check failed');
    });
  });

  describe('Asset Management', () => {
    describe('createAsset', () => {
      it('should create asset successfully', async () => {
        const mockAsset = {
          id: 'asset_123',
          status: 'preparing',
          playback_ids: [{ id: 'playback_123', policy: 'public' }],
        };
        const mockCreate = jest.fn().mockResolvedValue(mockAsset);
        (muxService as any).mux.video.assets.create = mockCreate;

        const result = await muxService.createAsset(
          { url: 'https://example.com/video.mp4' },
          { playback_policy: ['public'] }
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockAsset);
        expect(mockCreate).toHaveBeenCalledWith({
          inputs: [{ url: 'https://example.com/video.mp4' }],
          playback_policy: ['public'],
          encoding_tier: 'smart',
          normalize_audio: true,
          master_access: 'none',
          test: true,
        });
      });

      it('should handle asset creation errors', async () => {
        const mockCreate = jest.fn().mockRejectedValue(new Error('Creation failed'));
        (muxService as any).mux.video.assets.create = mockCreate;

        const result = await muxService.createAsset({ url: 'https://example.com/video.mp4' });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Creation failed');
      });
    });

    describe('getAsset', () => {
      it('should retrieve asset successfully', async () => {
        const mockAsset = {
          id: 'asset_123',
          status: 'ready',
          duration: 120.5,
        };
        const mockRetrieve = jest.fn().mockResolvedValue(mockAsset);
        (muxService as any).mux.video.assets.retrieve = mockRetrieve;

        const result = await muxService.getAsset('asset_123');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockAsset);
        expect(mockRetrieve).toHaveBeenCalledWith('asset_123');
      });

      it('should return error for missing asset ID', async () => {
        const result = await muxService.getAsset('');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Asset ID is required');
      });
    });

    describe('deleteAsset', () => {
      it('should delete asset successfully', async () => {
        const mockDelete = jest.fn().mockResolvedValue(undefined);
        (muxService as any).mux.video.assets.delete = mockDelete;

        const result = await muxService.deleteAsset('asset_123');

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ assetId: 'asset_123', deleted: true });
        expect(mockDelete).toHaveBeenCalledWith('asset_123');
      });

      it('should return error for missing asset ID', async () => {
        const result = await muxService.deleteAsset('');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Asset ID is required');
      });
    });
  });

  describe('Live Streaming', () => {
    describe('createLiveStream', () => {
      it('should create live stream successfully', async () => {
        const mockStream = {
          id: 'stream_123',
          status: 'idle',
          stream_key: 'stream_key_123',
          playback_ids: [{ id: 'playback_123', policy: 'public' }],
        };
        const mockCreate = jest.fn().mockResolvedValue(mockStream);
        (muxService as any).mux.video.liveStreams.create = mockCreate;

        const result = await muxService.createLiveStream({
          playback_policy: ['public'],
          latency_mode: 'low',
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockStream);
        expect(mockCreate).toHaveBeenCalledWith({
          playback_policy: ['public'],
          reconnect_window: 60,
          max_continuous_duration: 43200,
          latency_mode: 'low',
          test: true,
        });
      });
    });

    describe('deleteLiveStream', () => {
      it('should delete live stream successfully', async () => {
        const mockDelete = jest.fn().mockResolvedValue(undefined);
        (muxService as any).mux.video.liveStreams.delete = mockDelete;

        const result = await muxService.deleteLiveStream('stream_123');

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ streamId: 'stream_123', deleted: true });
        expect(mockDelete).toHaveBeenCalledWith('stream_123');
      });

      it('should return error for missing stream ID', async () => {
        const result = await muxService.deleteLiveStream('');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Stream ID is required');
      });
    });
  });

  describe('Playback URLs', () => {
    describe('getPlaybackUrl', () => {
      it('should generate public playback URL', async () => {
        const result = await muxService.getPlaybackUrl('playback_123');

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          url: 'https://stream.mux.com/playback_123.m3u8',
          playbackId: 'playback_123',
          type: 'video',
        });
      });

      it('should generate audio playback URL', async () => {
        const result = await muxService.getPlaybackUrl('playback_123', { type: 'audio' });

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          url: 'https://stream.mux.com/playback_123.m4a',
          playbackId: 'playback_123',
          type: 'audio',
        });
      });

      it('should return error for missing playback ID', async () => {
        const result = await muxService.getPlaybackUrl('');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Playback ID is required');
      });
    });
  });

  describe('Direct Upload', () => {
    describe('createDirectUpload', () => {
      it('should create direct upload successfully', async () => {
        const mockUpload = {
          id: 'upload_123',
          url: 'https://storage.googleapis.com/mux-uploads/upload_123',
          timeout: 3600,
        };
        const mockCreate = jest.fn().mockResolvedValue(mockUpload);
        (muxService as any).mux.video.uploads.create = mockCreate;

        const result = await muxService.createDirectUpload({
          cors_origin: 'https://example.com',
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockUpload);
        expect(mockCreate).toHaveBeenCalledWith({
          cors_origin: 'https://example.com',
          new_asset_settings: {
            playback_policy: ['public'],
            encoding_tier: 'smart',
            normalize_audio: true,
            test: true,
          },
          timeout: 3600,
        });
      });
    });

    describe('uploadVideo', () => {
      it('should create upload URL for video file', async () => {
        const mockUpload = {
          id: 'upload_123',
          url: 'https://storage.googleapis.com/mux-uploads/upload_123',
        };
        const mockCreate = jest.fn().mockResolvedValue(mockUpload);
        (muxService as any).mux.video.uploads.create = mockCreate;

        const result = await muxService.createDirectUpload({
          cors_origin: '*',
          new_asset_settings: {
            playback_policy: ['public'],
            encoding_tier: 'smart',
            normalize_audio: true,
            test: true
          }
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockUpload);
      });
    });
  });

  describe('Webhook Processing', () => {
    describe('processWebhook', () => {
      it('should process valid webhook successfully', async () => {
        // Mock webhook signature verification to return true
        jest.spyOn(muxService as any, 'verifyWebhookSignature').mockReturnValue(true);

        const webhookPayload = {
          type: 'video.asset.ready',
          object: { type: 'asset', id: 'asset_123' },
          id: 'webhook_123',
          environment: { name: 'test', id: 'env_123' },
          data: { id: 'asset_123', status: 'ready' },
          created_at: new Date().toISOString(),
        };

        const result = await muxService.processWebhook(webhookPayload, 'valid_signature');

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          event: 'asset_ready',
          processed: true,
        });
      });

      it('should reject webhook with invalid signature', async () => {
        // Mock webhook signature verification to return false
        jest.spyOn(muxService as any, 'verifyWebhookSignature').mockReturnValue(false);

        const result = await muxService.processWebhook('{}', 'invalid_signature');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid webhook signature');
      });

      it('should handle unknown webhook types', async () => {
        jest.spyOn(muxService as any, 'verifyWebhookSignature').mockReturnValue(true);

        const webhookPayload = {
          type: 'unknown.event.type',
          object: { type: 'unknown', id: 'unknown_123' },
          id: 'webhook_123',
          environment: { name: 'test', id: 'env_123' },
          data: {},
          created_at: new Date().toISOString(),
        };

        const result = await muxService.processWebhook(webhookPayload, 'valid_signature');

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          type: 'unknown.event.type',
          handled: false,
        });
      });
    });
  });

  describe('MUX Client Access', () => {
    it('should provide access to underlying MUX client', () => {
      const client = muxService.getMuxClient();
      expect(client).toBeDefined();
      expect(client.video).toBeDefined();
    });
  });
});

describe('Integration Tests', () => {
  it('should handle complete video workflow', async () => {
    // Mock all the required methods
    const mockUpload = { id: 'upload_123', url: 'https://example.com/upload' };
    const mockAsset = { id: 'asset_123', status: 'ready', playback_ids: [{ id: 'playback_123' }] };
    
    (muxService as any).mux.video.uploads.create = jest.fn().mockResolvedValue(mockUpload);
    (muxService as any).mux.video.assets.retrieve = jest.fn().mockResolvedValue(mockAsset);
    (muxService as any).mux.video.assets.list = jest.fn().mockResolvedValue({ data: [] });

    // Test upload
    const uploadResult = await muxService.createDirectUpload();
    expect(uploadResult.success).toBe(true);

    // Test asset retrieval
    const assetResult = await muxService.getAsset('asset_123');
    expect(assetResult.success).toBe(true);

    // Test playback URL generation
    const playbackResult = await muxService.getPlaybackUrl('playback_123');
    expect(playbackResult.success).toBe(true);

    // Test health check
    const healthResult = await muxService.healthCheck();
    expect(healthResult.success).toBe(true);
  });
}); 