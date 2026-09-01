import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { join } from 'node:path';
import { Repository } from 'typeorm';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { DocumentEntity } from './entities/document.entity';
import { FolderEntity } from './entities/folder.entity';

@Injectable()
class DataSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(FolderEntity)
    private readonly folderRepository: Repository<FolderEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.backfillUserId();
  }

  private async backfillUserId(): Promise<void> {
    try {
      const foldersWithoutUserId = await this.folderRepository
        .createQueryBuilder()
        .where('userId IS NULL OR userId = \'\'')
        .getMany();

      if (foldersWithoutUserId.length > 0) {
        for (const folder of foldersWithoutUserId) {
          folder.userId = 'user';
        }
        await this.folderRepository.save(foldersWithoutUserId);
      }

      const documentsWithoutUserId = await this.documentRepository
        .createQueryBuilder()
        .where('userId IS NULL OR userId = \'\'')
        .getMany();

      if (documentsWithoutUserId.length > 0) {
        for (const document of documentsWithoutUserId) {
          document.userId = 'user';
        }
        await this.documentRepository.save(documentsWithoutUserId);
      }
    } catch (error) {
      console.error('[Migration] Backfill failed. Check DB schema and backup.', error);
      throw error;
    }
  }
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: join(process.cwd(), 'data', 'notes.sqlite'),
      entities: [FolderEntity, DocumentEntity],
      synchronize: true,
      autoLoadEntities: true,
    }),
    TypeOrmModule.forFeature([FolderEntity, DocumentEntity]),
  ],
  controllers: [AuthController, NotesController],
  providers: [AuthGuard, AuthService, NotesService, DataSeeder],
})
export class AppModule {}
