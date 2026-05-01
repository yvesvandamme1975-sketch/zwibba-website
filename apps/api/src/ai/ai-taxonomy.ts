export const supportedCategoryIds = [
  'phones_tablets',
  'electronics',
  'food',
  'agriculture',
  'construction',
  'education',
  'music',
  'health',
  'beauty',
  'services',
  'emploi',
  'sports_leisure',
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
