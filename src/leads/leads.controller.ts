import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { ImportLeadsDto } from './dto/import-leads.dto';
import { AddNoteDto } from './dto/add-note.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { StorageService } from '../storage/storage.service';
import { multerConfig } from './config/multer.config';

@ApiTags('Leads')
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @Roles('ADMIN', 'ACQ_REP', 'DISPO')
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(@Body() createLeadDto: CreateLeadDto, @Request() req) {
    return this.leadsService.create(createLeadDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all leads with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: LeadQueryDto) {
    return this.leadsService.findAll(query);
  }

  /** Must be before @Get(':id') so /leads/counts is not matched as id="counts". */
  @Get('counts')
  @ApiOperation({ summary: 'Get lead counts for dashboard (from DB)' })
  @ApiResponse({ status: 200, description: 'Counts: totalLeads, newLeadsThisMonth, callBack, offerMade, contractOut, transaction' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCounts() {
    return this.leadsService.getLeadCounts();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get leads statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats() {
    return this.leadsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lead by ID' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'ACQ_REP', 'DISPO')
  @ApiOperation({ summary: 'Update a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead updated successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto, @Request() req) {
    // Check if user is trying to assign lead - only ADMIN, ACQ_REP, DISPO can assign
    if (updateLeadDto.assignedTo) {
      const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
      const canAssign = userRoles.some((role: string) => 
        ['ADMIN', 'admin', 'ACQ_REP', 'acq_rep', 'DISPO', 'dispo'].includes(role)
      );
      if (!canAssign) {
        throw new BadRequestException('Only ADMIN, ACQ_REP, or DISPO can assign leads');
      }
    }
    return this.leadsService.update(id, updateLeadDto, req.user.userId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'ACQ_REP')
  @ApiOperation({ summary: 'Delete a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }

  @Post('bulk-update')
  @Roles('ADMIN', 'ACQ_REP', 'DISPO')
  @ApiOperation({ summary: 'Bulk update leads' })
  @ApiResponse({ status: 200, description: 'Leads updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async bulkUpdate(
    @Body() body: { ids: string[]; updateData: Partial<UpdateLeadDto> },
    @Request() req,
  ) {
    // Check if user is trying to assign leads - only ADMIN, ACQ_REP, DISPO can assign
    if (body.updateData.assignedTo) {
      const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
      const canAssign = userRoles.some((role: string) => 
        ['ADMIN', 'admin', 'ACQ_REP', 'acq_rep', 'DISPO', 'dispo'].includes(role)
      );
      if (!canAssign) {
        throw new BadRequestException('Only ADMIN, ACQ_REP, or DISPO can assign leads');
      }
    }
    return this.leadsService.bulkUpdate(body.ids, body.updateData);
  }

  @Post('bulk-delete')
  @Roles('ADMIN', 'ACQ_REP')
  @ApiOperation({ summary: 'Bulk delete leads' })
  @ApiResponse({ status: 200, description: 'Leads deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() body: { ids: string[] }) {
    return this.leadsService.bulkDelete(body.ids);
  }

  @Post('admin/purge')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Purge all leads and import history (fresh data load)' })
  @ApiQuery({ name: 'confirm', required: true, description: 'Must be "yes" to confirm purge' })
  @ApiResponse({ status: 200, description: 'Purge completed' })
  @ApiResponse({ status: 400, description: 'Missing or invalid confirm' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - ADMIN only' })
  @HttpCode(HttpStatus.OK)
  async purgeAll(@Query('confirm') confirm: string) {
    if (confirm !== 'yes') {
      throw new BadRequestException('Purge requires query parameter confirm=yes');
    }
    return this.leadsService.purgeAll();
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({ summary: 'Upload document to lead' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const uploadResult = await this.storageService.uploadFile(file, 'leads');

    const documentData = {
      name: file.originalname,
      url: uploadResult.url,
      fileName: uploadResult.fileName,
      uploadedBy: req.user.userId,
      fileSize: uploadResult.size,
      mimeType: uploadResult.mimeType,
    };

    return this.leadsService.addDocument(id, documentData);
  }

  @Delete(':id/documents/:documentId')
  @ApiOperation({ summary: 'Remove document from lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document removed successfully' })
  @ApiResponse({ status: 404, description: 'Lead or document not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.leadsService.removeDocument(id, documentId);
  }

  @Post('import')
  @Roles('ADMIN', 'ACQ_REP', 'DISPO')
  @ApiOperation({ summary: 'Import leads from CSV mapping' })
  @ApiResponse({ status: 200, description: 'Leads imported successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async importLeads(
    @Body() importDto: ImportLeadsDto,
    @Request() req,
  ) {
    return this.leadsService.importLeads(importDto, req.user.userId);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Get timeline events for a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getEvents(@Param('id') id: string) {
    return this.leadsService.getEvents(id);
  }

  @Post(':id/notes')
  @Roles('ADMIN', 'ACQ_REP', 'DISPO', 'TX')
  @ApiOperation({ summary: 'Add a note to a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Note added successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async addNote(
    @Param('id') id: string,
    @Body() addNoteDto: AddNoteDto,
    @Request() req,
  ) {
    return this.leadsService.addNote(id, addNoteDto, req.user.userId);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'ACQ_REP', 'DISPO', 'TX')
  @ApiOperation({ summary: 'Update lead status and create event' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @Request() req,
  ) {
    return this.leadsService.updateStatus(id, updateStatusDto, req.user.userId);
  }

  @Patch(':id/assign')
  @Roles('ADMIN', 'ACQ_REP', 'DISPO')
  @ApiOperation({ summary: 'Assign lead to user and create event' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead assigned successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async assignLead(
    @Param('id') id: string,
    @Body() assignDto: AssignLeadDto,
    @Request() req,
  ) {
    return this.leadsService.assignLead(id, assignDto, req.user.userId);
  }
}
