import { IApplicationConfig } from "./application.interface";
import { ICacheConfig } from "./cache.interface";
import { IDatabaseConfig } from "./database.interface";
import { ISMSConfig } from "./sms.interface";
import { IStorageConfig } from "./storage.interface";

export interface IConfig {
  app: IApplicationConfig;
  db: IDatabaseConfig;
  cache?: ICacheConfig;
  storage?: IStorageConfig;
  sms?:ISMSConfig;
}
