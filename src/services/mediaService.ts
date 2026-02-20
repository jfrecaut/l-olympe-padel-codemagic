import { supabase } from '../lib/supabase';

export interface MediaUploadResult {
  url: string;
  path: string;
}

const BUCKET_NAME = 'media';

export const mediaService = {
  async uploadVideo(file: File, type: 'desktop' | 'mobile'): Promise<MediaUploadResult> {
    const fileExt = file.name.split('.').pop();
    const fileName = `welcome-video-${type}-${Date.now()}.${fileExt}`;
    const filePath = `videos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath,
    };
  },

  async uploadBanner(file: File, type: 'desktop' | 'mobile'): Promise<MediaUploadResult> {
    const fileExt = file.name.split('.').pop();
    const fileName = `welcome-banner-${type}-${Date.now()}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath,
    };
  },

  async uploadLogo(file: File): Promise<MediaUploadResult> {
    const fileExt = file.name.split('.').pop();
    const fileName = `company-logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath,
    };
  },

  async uploadFile(file: File, folder: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrl;
  },

  async deleteFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }
  },

  async uploadCourtImage(file: File): Promise<MediaUploadResult> {
    const fileExt = file.name.split('.').pop();
    const fileName = `court-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('court-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('court-images')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath,
    };
  },

  async deleteCourtImage(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('court-images')
      .remove([filePath]);

    if (error) {
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }
  },

  extractPathFromUrl(url: string): string | null {
    try {
      const matches = url.match(/\/storage\/v1\/object\/public\/media\/(.+)$/);
      return matches ? matches[1] : null;
    } catch {
      return null;
    }
  },

  extractCourtImagePathFromUrl(url: string): string | null {
    try {
      const matches = url.match(/\/storage\/v1\/object\/public\/court-images\/(.+)$/);
      return matches ? matches[1] : null;
    } catch {
      return null;
    }
  },
};
