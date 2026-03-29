export const supportedCategoryIds = [
  'phones_tablets',
  'electronics',
  'services',
  'emploi',
  'vehicles',
  'real_estate',
  'fashion',
  'home_garden',
] as const;

export const supportedConditionValues = [
  'new_item',
  'like_new',
  'used_good',
  'used_fair',
  'used_poor',
  'for_parts',
] as const;

export const defaultCategoryId = 'electronics';
export const defaultCondition = 'used_good';
