'use client';

import { useState, useCallback, useMemo } from 'react';

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
  } else if (data.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters';
  } else if (data.title.length > 100) {
    errors.title = 'Title must be 100 characters or less';
  }

  // Description validation (optional but has limits)
  if (data.description.length > 5000) {
    errors.description = 'Description must be 5000 characters or less';
  }

  // Tags validation
  if (data.tags.length > 10) {
    errors.tags = 'Maximum 10 tags allowed';
  }

  return errors;
};

export const useVideoFormState = () => {
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