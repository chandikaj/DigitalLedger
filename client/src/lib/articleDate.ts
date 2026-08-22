type ArticleDateValue = Date | string | number | null | undefined;

export interface ArticleDateFields {
  publishedAt?: ArticleDateValue;
  createdAt?: ArticleDateValue;
}

const MIN_VALID_ARTICLE_YEAR = 1972;

function parseValidArticleDate(value: ArticleDateValue): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() < MIN_VALID_ARTICLE_YEAR
  ) {
    return null;
  }

  return date;
}

export function getArticleDate(article: ArticleDateFields): Date | null {
  return (
    parseValidArticleDate(article.publishedAt) ??
    parseValidArticleDate(article.createdAt)
  );
}

export function formatArticleDate(
  article: ArticleDateFields,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = getArticleDate(article);
  return date ? date.toLocaleDateString("en-US", options) : "Draft";
}