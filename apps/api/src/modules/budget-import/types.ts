/** Type pour le fichier uploadé (évite la dépendance à Express.Multer dans certains contextes TS). */
export interface UploadedFileType {
  fieldname?: string;
  originalname?: string;
  buffer?: Buffer;
  mimetype?: string;
  size?: number;
}
