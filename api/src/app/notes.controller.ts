import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { MoveDocumentDto } from './dto/move-document.dto';
import { MoveFolderDto } from './dto/move-folder.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { NotesService } from './notes.service';

@Controller('notes')
@UseGuards(AuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get('tree')
  getTree(@Req() req: any) {
    return this.notesService.getTree(req.userId);
  }

  @Get('search')
  search(@Query('query') query = '', @Req() req: any) {
    return this.notesService.search(query, req.userId);
  }

  @Get('documents/:id')
  getDocument(@Param('id') id: string, @Req() req: any) {
    return this.notesService.getDocument(id, req.userId);
  }

  @Post('folders')
  createFolder(
    @Body(new ValidationPipe({ whitelist: true })) body: CreateFolderDto,
    @Req() req: any,
  ) {
    return this.notesService.createFolder(body, req.userId);
  }

  @Post('documents')
  createDocument(
    @Body(new ValidationPipe({ whitelist: true })) body: CreateDocumentDto,
    @Req() req: any,
  ) {
    return this.notesService.createDocument(body, req.userId);
  }

  @Patch('folders/:id')
  renameFolder(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: RenameItemDto,
    @Req() req: any,
  ) {
    return this.notesService.renameFolder(id, body.name, req.userId);
  }

  @Patch('folders/:id/move')
  moveFolder(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: MoveFolderDto,
    @Req() req: any,
  ) {
    return this.notesService.moveFolder(id, body.parentId ?? null, req.userId);
  }

  @Patch('documents/:id/rename')
  renameDocument(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: RenameItemDto,
    @Req() req: any,
  ) {
    return this.notesService.renameDocument(id, body.name, req.userId);
  }

  @Patch('documents/:id/move')
  moveDocument(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: MoveDocumentDto,
    @Req() req: any,
  ) {
    return this.notesService.moveDocument(id, body.folderId ?? null, req.userId);
  }

  @Patch('documents/:id')
  updateDocument(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: UpdateDocumentDto,
    @Req() req: any,
  ) {
    return this.notesService.updateDocument(id, body.content, req.userId, body.encrypted);
  }

  @Delete('folders/:id')
  deleteFolder(@Param('id') id: string, @Req() req: any) {
    return this.notesService.deleteFolder(id, req.userId);
  }

  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string, @Req() req: any) {
    return this.notesService.deleteDocument(id, req.userId);
  }
}
