'use client';

import { useCallback, useEffect, useMemo } from 'react';

import { useStepNavigation, WIZARD_STEPS } from './useStepNavigation';
import { useVideoFormState } from './useVideoFormState';
import { useVideoProcessing } from './useVideoProcessing';
import { useVideoUploadState } from './useVideoUploadState';

import type { VideoFormData, ValidationErrors } from './useVideoFormState';
import type { VideoAsset } from '@/lib/data-access/schemas/video.schema';

// Constants for upload steps
const UPLOAD_STEP = 0;
const DETAILS_STEP = 1;
const SETTINGS_STEP = 2;
const PUBLISH_STEP = 3;

// Constants for timeouts
const AUTO_SAVE_DELAY = 1000;

interface UseVideoUploadReturn {
  // Form state
  formData: VideoFormData;
  updateFormData: (data: Partial<VideoFormData>) => void;
  resetForm: () => void;
  isFormValid: boolean;
  validationErrors: ValidationErrors;
  
  // Upload state
  uploadProgress: number;
  uploadStatus: string;
  uploadError: string | null;
  isUploading: boolean;
  isProcessing: boolean;
  isUploadComplete: boolean;
  hasUploadError: boolean;
  
  // Step navigation
  currentStep: number;
  currentStepInfo: (typeof WIZARD_STEPS)[number];
  totalSteps: number;
  completedSteps: Set<number>;
  completionPercentage: number;
  canProceed: boolean;
  canGoBack: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  steps: typeof WIZARD_STEPS;
  
  // Video processing
  videoAsset: VideoAsset | undefined;
  thumbnails: string[];
  hasVideoAsset: boolean;
  isCreatingUploadUrl: boolean;
  isPublishing: boolean;
  canPublish: boolean;
  
  // Operations
  uploadVideo: (file: File) => Promise<void>;
  publishVideo: () => Promise<boolean>;
  nextStep: () => boolean;
  previousStep: () => void;
  goToStep: (step: number) => void;
  generateThumbnails: () => Promise<boolean>;
  reset: () => void;
  
  // Status helpers for UI
  isReadyToUpload: boolean;
  isReadyForDetails: boolean;
  isReadyForSettings: boolean;
  isReadyToPublish: boolean;
}

export const useVideoUpload = (collectiveId?: string): UseVideoUploadReturn => {
  // Sub-hooks for specific concerns
  const formState = useVideoFormState();
  const uploadState = useVideoUploadState();
  const videoProcessing = useVideoProcessing();
  
  // Initialize step navigation with basic validation
  const totalSteps = 4; // upload, details, settings, publish
  const stepNavigation = useStepNavigation(totalSteps);
  
  // Step-specific validation logic
  const canProceedFromCurrentStep = useMemo(() => {
    switch (stepNavigation.currentStep) {
      case UPLOAD_STEP: // Upload step - only need successful upload
        return uploadState.isComplete;
      case DETAILS_STEP: // Details step - need valid form data
        return formState.isValid;
      case SETTINGS_STEP: // Settings step - form should still be valid
        return formState.isValid;
      case PUBLISH_STEP: // Publish step - everything should be ready
        return formState.isValid && videoProcessing.canPublish;
      default:
        return false;
    }
  }, [stepNavigation.currentStep, uploadState.isComplete, formState.isValid, videoProcessing.canPublish]);

  // Auto-save form data to localStorage for persistence
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const titleTrimmed = formState.data.title?.trim() ?? '';
      const descriptionTrimmed = formState.data.description?.trim() ?? '';
      if (titleTrimmed || descriptionTrimmed) {
        localStorage.setItem('video-upload-draft', JSON.stringify(formState.data));
      }
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [formState.data]);

  // Load saved draft on initialization
  useEffect(() => {
    const savedDraft = localStorage.getItem('video-upload-draft');
    if (savedDraft !== null && savedDraft !== '') {
      try {
        const draftData = JSON.parse(savedDraft) as Partial<VideoFormData>;
        formState.update(draftData);
      } catch (error: unknown) {
        console.error('Failed to load saved draft:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set collective ID if provided
  useEffect(() => {
    const hasCollectiveId = collectiveId !== undefined && collectiveId !== null && collectiveId !== '';
    const formCollectiveId = formState.data.collectiveId;
    const noFormCollectiveId = formCollectiveId === undefined || formCollectiveId === null || formCollectiveId === '';
    const shouldSetCollectiveId = hasCollectiveId && noFormCollectiveId;
    if (shouldSetCollectiveId) {
      formState.update({ collectiveId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectiveId]);

  // Main upload operation
  const uploadVideo = useCallback(async (file: File) => {
    try {
      uploadState.start();
      
      // Create upload URL with current form data
      const uploadUrl = await videoProcessing.createUploadUrl(formState.data);
      
      // Upload the file with progress tracking
      await uploadState.upload(file, uploadUrl);
      
      // Mark upload step as complete and move to next step
      stepNavigation.markStepComplete(UPLOAD_STEP);
      stepNavigation.next();
      
      uploadState.setComplete();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      uploadState.setError(errorMessage);
      console.error('Upload failed:', error);
    }
  }, [formState.data, uploadState, videoProcessing, stepNavigation]);

  // Update video metadata in background (TEMPORARILY DISABLED)
  // const updateMetadata = useCallback(async () => {
  //   if (!videoProcessing.hasAsset) return;

  //   try {
  //     await videoProcessing.updateVideoMetadata(formState.data);
  //   } catch (error: unknown) {
  //     console.error('Failed to update metadata:', error);
  //     // Don't throw here as this is a background operation
  //   }
  // }, [formState.data, videoProcessing]);

  // Publish the video
  const publishVideo = useCallback(async () => {
    try {
      await videoProcessing.publish(formState.data);
      
      // Clear the saved draft
      localStorage.removeItem('video-upload-draft');
      
      // Navigate to success (handled by parent component)
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Publishing failed';
      uploadState.setError(errorMessage);
      console.error('Publishing failed:', error);
      return false;
    }
  }, [formState.data, videoProcessing, uploadState]);

  // Generate thumbnails manually (only when mux_asset_id exists)
  const generateThumbnails = useCallback(async () => {
    const muxAssetId = videoProcessing.asset?.mux_asset_id;
    if (muxAssetId === null || muxAssetId === undefined || muxAssetId === '') {
      console.warn('Cannot generate thumbnails: Video not yet processed by MUX');
      return false;
    }

    try {
      await videoProcessing.generateThumbnails();
      return true;
    } catch (error: unknown) {
      console.error('Failed to generate thumbnails:', error);
      return false;
    }
  }, [videoProcessing]);

  // Enhanced navigation with validation
  const nextStep = useCallback(() => {
    // Validate current step before proceeding
    if (!canProceedFromCurrentStep) {
      return false; // Validation failed
    }

    // TEMPORARILY DISABLED: Metadata updates fail because many form fields don't exist in DB
    // TODO: Re-enable once we decide how to handle form fields that have no database columns
    // if (stepNavigation.currentStep === DETAILS_STEP || stepNavigation.currentStep === SETTINGS_STEP) {
    //   updateMetadata();
    // }

    stepNavigation.next();
    return true;
  }, [stepNavigation, canProceedFromCurrentStep]);

  const previousStep = useCallback(() => {
    stepNavigation.previous();
  }, [stepNavigation]);

  const goToStep = useCallback((step: number) => {
    // Additional validation for step jumping could be added here
    stepNavigation.goToStep(step);
  }, [stepNavigation]);

  // Reset everything
  const reset = useCallback(() => {
    formState.reset();
    uploadState.reset();
    stepNavigation.reset();
    videoProcessing.reset();
    localStorage.removeItem('video-upload-draft');
  }, [formState, uploadState, stepNavigation, videoProcessing]);

  return {
    // Form state
    formData: formState.data,
    updateFormData: formState.update,
    resetForm: formState.reset,
    isFormValid: formState.isValid,
    validationErrors: formState.errors,

    // Upload state
    uploadProgress: uploadState.progress,
    uploadStatus: uploadState.status,
    uploadError: uploadState.error,
    isUploading: uploadState.isUploading,
    isProcessing: uploadState.isProcessing,
    isUploadComplete: uploadState.isComplete,
    hasUploadError: uploadState.hasError,

    // Step navigation
    currentStep: stepNavigation.currentStep,
    currentStepInfo: stepNavigation.currentStepInfo,
    totalSteps: stepNavigation.totalSteps,
    completedSteps: stepNavigation.completedSteps,
    completionPercentage: stepNavigation.completionPercentage,
    canProceed: stepNavigation.canGoNext && canProceedFromCurrentStep,
    canGoBack: stepNavigation.canGoBack,
    isFirstStep: stepNavigation.isFirstStep,
    isLastStep: stepNavigation.isLastStep,
    steps: stepNavigation.steps,

    // Video processing
    videoAsset: videoProcessing.asset,
    thumbnails: videoProcessing.thumbnails,
    hasVideoAsset: videoProcessing.hasAsset,
    isCreatingUploadUrl: videoProcessing.isCreatingUploadUrl,
    isPublishing: videoProcessing.isPublishing,
    canPublish: videoProcessing.canPublish,

    // Operations
    uploadVideo,
    publishVideo,
    nextStep,
    previousStep,
    goToStep,
    generateThumbnails,
    reset,

    // Status helpers for UI
    isReadyToUpload: stepNavigation.currentStep === UPLOAD_STEP && !uploadState.isUploading,
    isReadyForDetails: stepNavigation.currentStep === DETAILS_STEP && uploadState.isComplete,
    isReadyForSettings: stepNavigation.currentStep === SETTINGS_STEP,
    isReadyToPublish: stepNavigation.currentStep === PUBLISH_STEP && formState.isValid,
  };
}; 