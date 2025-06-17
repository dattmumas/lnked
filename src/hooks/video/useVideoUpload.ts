'use client';

import { useCallback, useEffect, useMemo } from 'react';

import { useStepNavigation } from './useStepNavigation';
import { useVideoFormState } from './useVideoFormState';
import { useVideoProcessing } from './useVideoProcessing';
import { useVideoUploadState } from './useVideoUploadState';

// Constants for upload steps
const UPLOAD_STEP = 0;
const DETAILS_STEP = 1;
const SETTINGS_STEP = 2;
const PUBLISH_STEP = 3;

// Constants for timeouts
const AUTO_SAVE_DELAY = 1000;

export const useVideoUpload = (collectiveId?: string) => {
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
      if (formState.data.title || formState.data.description) {
        localStorage.setItem('video-upload-draft', JSON.stringify(formState.data));
      }
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [formState.data]);

  // Load saved draft on initialization
  useEffect(() => {
    const savedDraft = localStorage.getItem('video-upload-draft');
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        formState.update(draftData);
      } catch (error) {
        console.error('Failed to load saved draft:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set collective ID if provided
  useEffect(() => {
    if (collectiveId && !formState.data.collectiveId) {
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
    } catch (error) {
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
  //   } catch (error) {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Publishing failed';
      uploadState.setError(errorMessage);
      console.error('Publishing failed:', error);
      return false;
    }
  }, [formState.data, videoProcessing, uploadState]);

  // Generate thumbnails manually (only when mux_asset_id exists)
  const generateThumbnails = useCallback(async () => {
    if (!videoProcessing.asset?.mux_asset_id) {
      console.warn('Cannot generate thumbnails: Video not yet processed by MUX');
      return false;
    }

    try {
      await videoProcessing.generateThumbnails();
      return true;
    } catch (error) {
      console.error('Failed to generate thumbnails:', error);
      return false;
    }
  }, [videoProcessing]);

  // REMOVED: Auto-generation of thumbnails on step 3
  // Thumbnails should only be generated manually when mux_asset_id is available

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