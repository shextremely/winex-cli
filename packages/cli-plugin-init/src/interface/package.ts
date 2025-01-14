export interface GotOptions {
  version: string;
  registryUrl: string;
}

export interface IPackageBaseInfo {
  name: string;
  version: string;
  registry?: string;
}

export interface IAddPackageOptions {
  dev?: boolean;
}

export interface IMaterialSource {
  type: string;
  npm: string;
  version: string;
  registry: string;
}

type MaterialKey =
  | "common"
  | "clinical"
  | "execution"
  | "finance"
  | "knowledge"
  | "record"
  | "person";

interface IMaterialBaseInfo {
  name: string;
  title: string;
  homepage: string;
  descriptions: string;
  category: string;
  domain: string;
  registry: string;
  source: IMaterialSource;
  dependencies: {
    [key: string]: string;
  };
  publishTime: string;
  updateTime: string;
}

export interface IComponentsInfo extends IMaterialBaseInfo {}

type ScaffoldCategory = "app_indep" | "app_main" | "app_sub";

export interface IScaffoldInfo extends IMaterialBaseInfo {
  category: ScaffoldCategory;
  screenshoot: string;
  screenshoots?: string[];
}

export interface IBlockInfo extends IMaterialBaseInfo {
  screenshoot: string;
  screenshoots?: string[];
}

export interface IPageInfo extends IMaterialBaseInfo {
  screenshoot: string;
  screenshoots?: string[];
}

export interface IMaterialsInfo {
  name: string;
  title: string;
  key: MaterialKey;
  description: string;
  components: IComponentsInfo[];
  blocks: IBlockInfo[];
  pages: any[];
  scaffolds: IScaffoldInfo[];
  registry: string;
  unpkgHost: string;
  author: string;
}
