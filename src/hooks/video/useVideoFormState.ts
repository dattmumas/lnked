'use client';

import { useState, useCallback, useMemo } from 'react';

// Constants for validation rules
const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_TAGS_COUNT = 10;

export interface VideoFormData {
  title: string;
  description: string;
  tags: string[];
  thumbnailUrl: string;
  privacySetting: 'public' | 'unlisted' | 'private';
  encodingTier: 'smart' | 'baseline' | 'high';
  collectiveId?: string;
}

export interface ValidationErrors {
  title?: string;
  description?: string;
  tags?: string;
  general?: string;
}

interface UseVideoFormStateReturn {
  data: VideoFormData;
  update: (updates: Partial<VideoFormData>) => void;
  reset: () => void;
  isValid: boolean;
  errors: ValidationErrors;
  validateFormData: () => boolean;
}

const initialFormData: VideoFormData = {
  title: '',
  description: '',
  tags: [],
  thumbnailUrl: '',
  privacySetting: 'public',
  encodingTier: 'smart',
};

const validateFormData = (data: VideoFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Title validation
  if (!data.title.trim()) {
    errors.title = 'Title is required';
  } else if (data.title.trim().length < MIN_TITLE_LENGTH) {
    errors.title = `Title must be at least ${MIN_TITLE_LENGTH} characters`;
  } else if (data.title.length > MAX_TITLE_LENGTH) {
    errors.title = `Title must be ${MAX_TITLE_LENGTH} characters or less`;
  }

  // Description validation (optional but has limits)
  if (data.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`;
  }

  // Tags validation
  if (data.tags.length > MAX_TAGS_COUNT) {
    errors.tags = `Maximum ${MAX_TAGS_COUNT} tags allowed`;
  }

  return errors;
};

export const useVideoFormState = (): UseVideoFormStateReturn => {
  const [formData, setFormData] = useState<VideoFormData>(initialFormData);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const updateFormData = useCallback((updates: Partial<VideoFormData>) => {
    setFormData((prev) => {
      const newData = { ...prev, ...updates };
      // Real-time validation
      const errors = validateFormData(newData);
      setValidationErrors(errors);
      return newData;
    });
  }, []);

  const isValid = useMemo(
    () => 
      Object.keys(validationErrors).length === 0 && 
      formData.title.trim().length > 0,
    [validationErrors, formData.title]
  );

  const reset = useCallback(() => {
    setFormData(initialFormData);
    setValidationErrors({});
  }, []);

  return {
    data: formData,
    update: updateFormData,
    reset,
    isValid,
    errors: validationErrors,
    validateFormData: () => {
      const errors = validateFormData(formData);
      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    },
  };
}; 