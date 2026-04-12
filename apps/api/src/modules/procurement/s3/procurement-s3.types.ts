export type ProcurementS3ConfigSource = 'db' | 'env';

export interface ResolvedProcurementS3Config {
  source: ProcurementS3ConfigSource;
  /** Vide : résolution AWS standard pour `region` (sans endpoint personnalisé). */
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  useSsl: boolean;
  forcePathStyle: boolean;
}
