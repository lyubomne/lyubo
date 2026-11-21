import changesSchema from './changes.sql?raw';
import triggersSchema from './triggers.sql?raw';
import lyuboSchema from './lyubo.sql?raw';
import tagsSchema from './tags.sql?raw';
import lyuboTagsSchema from './lyubo_tags.sql?raw';
import lyuboWithTagsSchema from './lyubo_with_tags.sql?raw';

// Local SQL schemas in dependency order. The app and the tests run exactly this list
export const LOCAL_SCHEMAS = [
	changesSchema,
	triggersSchema,
	lyuboSchema,
	tagsSchema,
	lyuboTagsSchema,
	lyuboWithTagsSchema
] as const;
