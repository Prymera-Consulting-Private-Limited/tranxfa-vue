import {config} from '@vue/test-utils';
import i18n from '@/i18n.js';

// Copy now comes from the catalogue, so a mounted component needs the plugin.
// Installing it once here keeps every spec from having to know that, and keeps
// the specs asserting what the customer reads rather than where it came from.
config.global.plugins = [...(config.global.plugins ?? []), i18n];
