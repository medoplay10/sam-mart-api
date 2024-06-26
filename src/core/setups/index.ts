
import CacheSetup from './cache.setup';
import ConfigurationSetup from './configuration.setup';
import DatabaseSetup from './database.setup';
import StorageSetup from './storage.setup';
import ServeStaticSetup from './serve-static.setup';
import I18nSetup from './i18n.setup';
import ScheduleSetup from './schedule.setup';
import ApiRequestLimit from './api-limit.setup';

export default () => [
  ApiRequestLimit(),
  ConfigurationSetup(), // Configuration Setup
  DatabaseSetup(), // Database Setup
  StorageSetup(), // Storage Setup
  CacheSetup(), // Cache Setup
  ServeStaticSetup(), // Serve Static Setup
  I18nSetup(), // I18n Setup
  ScheduleSetup() // Schedule Setup
];