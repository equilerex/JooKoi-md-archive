import { UpdateDocumentRequest } from '@shared/models';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateDocumentDto implements UpdateDocumentRequest {
  @IsString()
  content!: string;

  @IsOptional()
  @IsBoolean()
  encrypted?: boolean;
}
