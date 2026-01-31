import { lyuboTable } from './lyubo';
import { tagsTable } from './tags';
import { lyuboTagsTable } from './lyuboTags';
import type { TableDescriptor } from './types';

export const TABLES: Record<string, TableDescriptor> = {
	lyubo_local: lyuboTable,
	tags_local: tagsTable,
	lyubo_tags_local: lyuboTagsTable
};
