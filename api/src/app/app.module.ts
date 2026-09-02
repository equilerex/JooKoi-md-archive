import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { SqliteDb } from './database.provider';

@Module({
  controllers: [AuthController, NotesController],
  providers: [AuthGuard, AuthService, NotesService, SqliteDb],
})
export class AppModule {}
