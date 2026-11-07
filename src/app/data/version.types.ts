export type ReleaseStatus = 'published' | 'release-candidate' | 'coming-soon';

export interface VersionMeta {
  version: string;
  status: ReleaseStatus;
  notes?: string;
}

export interface FrameworkMeta {
  id: 'angular' | 'react' | 'vue' | 'svelte';
  name: string;
  status: ReleaseStatus;
  packageName?: string;
  versions: VersionMeta[];
  /** Latest published npm version; omit when none exist. */
  latestPublished: string | null;
  docsPath: string | null;
}
