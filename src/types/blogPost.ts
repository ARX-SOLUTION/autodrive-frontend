export interface BlogPostSummary {
  slug: string;
  tags: string[];
  title_uz: string;
  title_ru: string;
  title_en: string;
  excerpt_uz: string;
  excerpt_ru: string;
  excerpt_en: string;
  cover_image_url: string | null;
  view_count: number;
  published_at: string;
}

export interface BlogPost extends BlogPostSummary {
  body_uz: string;
  body_ru: string;
  body_en: string;
}
