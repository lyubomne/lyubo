import { collectionsTable } from './collections';
import { lyuboTable } from './lyubo';
import { tagsTable } from './tags';
import { lyuboTagsTable } from './lyuboTags';
import type { TableDescriptor } from './types';

// Keyed by the table name the client logs in `changes` (the merged view = server table name)
export const TABLES: Record<string, TableDescriptor> = {
	collections: collectionsTable,
	lyubo: lyuboTable,
	tags: tagsTable,
	lyubo_tags: lyuboTagsTable
};

export * from './types';
