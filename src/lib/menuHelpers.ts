import { CategoryRef, MenuItem } from '../types';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

const getRefValue = (ref: CategoryRef | undefined | null) => {
  if (!ref) return null;
  if (typeof ref === 'string') return { id: ref, name: ref, slug: slugify(ref) };

  return {
    id: ref._id || ref.id || null,
    name: ref.name || '',
    slug: ref.slug || (ref.name ? slugify(ref.name) : ''),
    image: ref.image,
    status: ref.status,
    displayOrder: ref.displayOrder,
  };
};

export const getCategoryId = (categoryRef: CategoryRef | undefined | null) => {
  const value = getRefValue(categoryRef);
  return value?.id || '';
};

export const getCategoryName = (categoryRef: CategoryRef | undefined | null, fallback = 'Chưa phân loại') => {
  const value = getRefValue(categoryRef);
  return value?.name?.trim() || fallback;
};

export const getCategorySlug = (categoryRef: CategoryRef | undefined | null) => {
  const value = getRefValue(categoryRef);
  return value?.slug || '';
};

export const getMenuItemId = (item: Pick<MenuItem, 'id' | '_id'>) => item.id || item._id || '';

export const getMenuItemImageUrl = (item: Pick<MenuItem, 'images'>) => {
  const imageId = item.images?.[0];
  return imageId ? `/api/images/${imageId}` : '';
};

export const getMenuItemCategoryName = (item: Pick<MenuItem, 'categoryId' | 'category'>, fallback = 'Chưa phân loại') => {
  if (item.category) return item.category;
  return getCategoryName(item.categoryId, fallback);
};

export const getMenuItemCategorySlug = (item: Pick<MenuItem, 'categoryId' | 'category'>) => {
  if (item.category) return slugify(item.category);
  return getCategorySlug(item.categoryId);
};

export const getMenuItemCategoryId = (item: Pick<MenuItem, 'categoryId'>) => getCategoryId(item.categoryId);
