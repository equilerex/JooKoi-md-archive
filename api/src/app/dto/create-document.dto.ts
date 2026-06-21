import { CreateDocumentRequest } from '@shared/models';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDocumentDto implements CreateDocumentRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/\.(md|mdx)$/i, { message: 'Document name must end with .md or .mdx' })
  name!: string;

  @IsOptional()
  @IsString()
  folderId!: string | null;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  encrypted?: boolean;
}
