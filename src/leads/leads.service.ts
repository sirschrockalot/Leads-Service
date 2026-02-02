import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Lead, LeadDocument } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { ImportLeadsDto, ImportLeadsResponseDto, DryRunLeadsResponseDto } from './dto/import-leads.dto';
import { AddNoteDto } from './dto/add-note.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { StorageService } from '../storage/storage.service';
import { LeadEventsService } from './services/lead-events.service';
import { LeadEventType } from './schemas/lead-event.schema';
import { ImportRun, ImportRunDocument } from './schemas/import-run.schema';
import { normalizePhone, normalizeAddress } from './utils/normalization.util';
import { stripHtml } from './utils/strip-html.util';
import { mapImportStatus } from './utils/import-status.util';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name, 'leads') private leadModel: Model<LeadDocument>,
    @InjectModel(ImportRun.name, 'leads') private importRunModel: Model<ImportRunDocument>,
    private storageService: StorageService,
    private leadEventsService: LeadEventsService,
  ) {}

  async create(createLeadDto: CreateLeadDto, createdBy: string): Promise<Lead> {
    try {
      // Normalize phone and address for dedupe
      const phoneNormalized = normalizePhone(createLeadDto.phone);
      const addressNormalized = createLeadDto.address
        ? normalizeAddress(createLeadDto.address)
        : undefined;

      const lead = new this.leadModel({
        ...createLeadDto,
        firstName: createLeadDto.firstName ?? '',
        lastName: createLeadDto.lastName ?? '',
        phoneNormalized,
        addressNormalized,
        createdBy: new Types.ObjectId(createdBy),
        assignedTo: createLeadDto.assignedTo ? new Types.ObjectId(createLeadDto.assignedTo) : undefined,
      });

      return await lead.save();
    } catch (error: any) {
      if (error.code === 11000) {
        throw new BadRequestException('Lead with this email or dealId already exists');
      }
      throw error;
    }
  }

  async findAll(query: LeadQueryDto) {
    const {
      search,
      status,
      source,
      priority,
      assignedTo,
      createdBy,
      tags,
      minScore,
      maxScore,
      minEstimatedValue,
      maxEstimatedValue,
      startDate,
      endDate,
      lastContactStartDate,
      lastContactEndDate,
      nextFollowUpStartDate,
      nextFollowUpEndDate,
      isActive,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    // Search filter
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Source filter
    if (source) {
      filter.source = source;
    }

    // Priority filter
    if (priority) {
      filter.priority = priority;
    }

    // Assigned to filter
    if (assignedTo) {
      filter.assignedTo = new Types.ObjectId(assignedTo);
    }

    // Created by filter
    if (createdBy) {
      filter.createdBy = new Types.ObjectId(createdBy);
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // Score range filter
    if (minScore !== undefined || maxScore !== undefined) {
      filter.score = {};
      if (minScore !== undefined) filter.score.$gte = minScore;
      if (maxScore !== undefined) filter.score.$lte = maxScore;
    }

    // Estimated value range filter
    if (minEstimatedValue !== undefined || maxEstimatedValue !== undefined) {
      filter.estimatedValue = {};
      if (minEstimatedValue !== undefined) filter.estimatedValue.$gte = minEstimatedValue;
      if (maxEstimatedValue !== undefined) filter.estimatedValue.$lte = maxEstimatedValue;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Last contact date filter
    if (lastContactStartDate || lastContactEndDate) {
      filter.lastContactDate = {};
      if (lastContactStartDate) filter.lastContactDate.$gte = new Date(lastContactStartDate);
      if (lastContactEndDate) filter.lastContactDate.$lte = new Date(lastContactEndDate);
    }

    // Next follow-up date filter
    if (nextFollowUpStartDate || nextFollowUpEndDate) {
      filter.nextFollowUpDate = {};
      if (nextFollowUpStartDate) filter.nextFollowUpDate.$gte = new Date(nextFollowUpStartDate);
      if (nextFollowUpEndDate) filter.nextFollowUpDate.$lte = new Date(nextFollowUpEndDate);
    }

    // Active filter
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    // Sort configuration
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      this.leadModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .exec(),
      this.leadModel.countDocuments(filter),
    ]);

    return {
      data: leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /** Reserved path segments that must not be treated as lead IDs (avoids 400 when route order is wrong). */
  private static readonly RESERVED_SEGMENTS = new Set(['counts', 'stats', 'import', 'bulk-update', 'bulk-delete', 'admin']);

  async findOne(id: string): Promise<Lead> {
    if (LeadsService.RESERVED_SEGMENTS.has(id)) {
      throw new NotFoundException('Not found');
    }
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid lead ID');
    }

    const lead = await this.leadModel
      .findById(id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async update(id: string, updateLeadDto: UpdateLeadDto, userId?: string): Promise<Lead> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid lead ID');
    }

    // Get current lead to check for changes
    const currentLead = await this.leadModel.findById(id).exec();
    if (!currentLead) {
      throw new NotFoundException('Lead not found');
    }

    const updateData: any = { ...updateLeadDto };
    
    if (updateLeadDto.assignedTo) {
      updateData.assignedTo = new Types.ObjectId(updateLeadDto.assignedTo);
    }

    // Update normalized fields if phone or address changed
    if (updateLeadDto.phone) {
      updateData.phoneNormalized = normalizePhone(updateLeadDto.phone);
    }
    if (updateLeadDto.address) {
      updateData.addressNormalized = normalizeAddress(updateLeadDto.address);
    }

    const lead = await this.leadModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Create events for status and assignment changes if userId provided
    if (userId) {
      if (updateLeadDto.status && currentLead.status !== updateLeadDto.status) {
        await this.leadEventsService.createEvent(
          id,
          LeadEventType.STATUS_CHANGED,
          userId,
          {
            oldStatus: currentLead.status,
            newStatus: updateLeadDto.status,
          },
        );
      }

      if (updateLeadDto.assignedTo) {
        const oldAssignedTo = currentLead.assignedTo?.toString();
        const newAssignedTo = updateLeadDto.assignedTo;
        if (oldAssignedTo !== newAssignedTo) {
          await this.leadEventsService.createEvent(
            id,
            LeadEventType.ASSIGNED,
            userId,
            {
              oldAssignedTo: oldAssignedTo || null,
              newAssignedTo: newAssignedTo,
            },
          );
        }
      }
    }

    return lead;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid lead ID');
    }

    const result = await this.leadModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Lead not found');
    }
  }

  /**
   * Status values that map to each dashboard bucket.
   * Includes: enum + display variants + pipeline statuses from PDR/import (CONTACTED, OFFER_SENT, UNDER_CONTRACT, CONVERTED).
   */
  private static readonly STATUS_CALL_BACK = [
    'CALL_BACK', 'Call Back', 'call_back', 'CallBack',
    'CONTACTED', 'Contacted', 'contacted',
    'FOLLOW_UP', 'Follow Up', 'follow_up', 'FollowUp',
    'APPT_SET', 'Appt Set', 'appt_set', 'ApptSet',
  ];
  /** Offer Made: count leads where status or disposition is "Offer Made" (any common variant). */
  private static readonly STATUS_OFFER_MADE = [
    'Offer Made', 'OFFER_MADE', 'Offer made', 'offer made', 'offer_made', 'OfferMade',
  ];
  private static readonly STATUS_CONTRACT_OUT = [
    'CONTRACT_OUT', 'Contract Out', 'contract_out', 'ContractOut',
  ];
  private static readonly STATUS_TRANSACTION = [
    'TRANSACTION', 'Transaction', 'transaction',
    'CONVERTED', 'Converted', 'converted',
    'UNDER_CONTRACT', 'Under Contract', 'under_contract', 'UnderContract',
  ];
  private static readonly STATUS_NEGOTIATING_OFFER = [
    'NEGOTIATING_OFFER', 'Negotiating Offer', 'negotiating_offer', 'NegotiatingOffer',
  ];

  /**
   * Returns lead counts for dashboard from DB:
   * totalLeads, newLeadsThisMonth (createdAt >= start of current month),
   * callBack, offerMade, contractOut, transaction, negotiatingOffer (each matches enum + display variants).
   */
  async getLeadCounts(): Promise<{
    totalLeads: number;
    newLeadsThisMonth: number;
    callBack: number;
    offerMade: number;
    contractOut: number;
    transaction: number;
    negotiatingOffer: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await this.leadModel.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          newThisMonth: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $count: 'count' },
          ],
          callBack: [
            { $match: { status: { $in: LeadsService.STATUS_CALL_BACK } } },
            { $count: 'count' },
          ],
          offerMade: [
            {
              $match: {
                $or: [
                  { status: { $in: LeadsService.STATUS_OFFER_MADE } },
                  { disposition: { $in: LeadsService.STATUS_OFFER_MADE } },
                  { status: { $regex: /offer\s*made/i } },
                  { disposition: { $regex: /offer\s*made/i } },
                ],
              },
            },
            { $count: 'count' },
          ],
          contractOut: [
            { $match: { status: { $in: LeadsService.STATUS_CONTRACT_OUT } } },
            { $count: 'count' },
          ],
          transaction: [
            { $match: { status: { $in: LeadsService.STATUS_TRANSACTION } } },
            { $count: 'count' },
          ],
          negotiatingOffer: [
            { $match: { status: { $in: LeadsService.STATUS_NEGOTIATING_OFFER } } },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const pick = (arr: { count: number }[]): number =>
      arr && arr[0] && typeof arr[0].count === 'number' ? arr[0].count : 0;
    const f = result[0] || {};

    return {
      totalLeads: pick(f.total),
      newLeadsThisMonth: pick(f.newThisMonth),
      callBack: pick(f.callBack),
      offerMade: pick(f.offerMade),
      contractOut: pick(f.contractOut),
      transaction: pick(f.transaction),
      negotiatingOffer: pick(f.negotiatingOffer),
    };
  }

  async getStats() {
    const stats = await this.leadModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byStatus: {
            $push: {
              status: '$status',
              count: 1
            }
          },
          bySource: {
            $push: {
              source: '$source',
              count: 1
            }
          },
          byPriority: {
            $push: {
              priority: '$priority',
              count: 1
            }
          },
          totalValue: { $sum: '$estimatedValue' },
          avgScore: { $avg: '$score' }
        }
      },
      {
        $project: {
          total: 1,
          totalValue: 1,
          avgScore: { $round: ['$avgScore', 2] },
          statusBreakdown: {
            $reduce: {
              input: '$byStatus',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [
                      [{ k: '$$this.status', v: { $sum: ['$$value.$$this.status', 1] } }]
                    ]
                  }
                ]
              }
            }
          },
          sourceBreakdown: {
            $reduce: {
              input: '$bySource',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [
                      [{ k: '$$this.source', v: { $sum: ['$$value.$$this.source', 1] } }]
                    ]
                  }
                ]
              }
            }
          },
          priorityBreakdown: {
            $reduce: {
              input: '$byPriority',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [
                      [{ k: '$$this.priority', v: { $sum: ['$$value.$$this.priority', 1] } }]
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      totalValue: 0,
      avgScore: 0,
      statusBreakdown: {},
      sourceBreakdown: {},
      priorityBreakdown: {}
    };
  }

  async bulkUpdate(ids: string[], updateData: Partial<UpdateLeadDto>): Promise<{ updated: number; failed: string[] }> {
    const validIds = ids.filter(id => Types.ObjectId.isValid(id));
    const invalidIds = ids.filter(id => !Types.ObjectId.isValid(id));

    const result = await this.leadModel.updateMany(
      { _id: { $in: validIds.map(id => new Types.ObjectId(id)) } },
      updateData
    );

    return {
      updated: result.modifiedCount,
      failed: invalidIds
    };
  }

  async bulkDelete(ids: string[]): Promise<{ deleted: number; failed: string[] }> {
    const validIds = ids.filter(id => Types.ObjectId.isValid(id));
    const invalidIds = ids.filter(id => !Types.ObjectId.isValid(id));

    const result = await this.leadModel.deleteMany({
      _id: { $in: validIds.map(id => new Types.ObjectId(id)) }
    });

    return {
      deleted: result.deletedCount,
      failed: invalidIds
    };
  }

  /**
   * Purge all leads and import-run records. Use for fresh data load (e.g. after fixing import issues).
   * ADMIN only. Does not delete lead events or tasks; those become orphaned but are harmless.
   */
  async purgeAll(): Promise<{ deletedLeads: number; deletedImportRuns: number }> {
    const [leadResult, importRunResult] = await Promise.all([
      this.leadModel.deleteMany({}),
      this.importRunModel.deleteMany({}),
    ]);
    return {
      deletedLeads: leadResult.deletedCount,
      deletedImportRuns: importRunResult.deletedCount,
    };
  }

  async addDocument(id: string, documentData: any): Promise<Lead> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid lead ID');
    }

    const lead = await this.leadModel.findById(id).exec();
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (!lead.documents) {
      lead.documents = [];
    }

    const newDocument = {
      id: uuidv4(),
      ...documentData,
      uploadedAt: new Date(),
    };

    lead.documents.push(newDocument);
    return lead.save();
  }

  async removeDocument(id: string, documentId: string): Promise<Lead> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid lead ID');
    }

    const lead = await this.leadModel.findById(id).exec();
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (!lead.documents) {
      throw new NotFoundException('No documents found for this lead');
    }

    const documentIndex = lead.documents.findIndex(doc => doc.id === documentId);
    if (documentIndex === -1) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    const document = lead.documents[documentIndex];
    
    // Delete file from GCS if fileName is stored
    if (document.fileName) {
      try {
        await this.storageService.deleteFile(document.fileName);
      } catch (error) {
        // Log error but don't fail the operation
        console.error(`Failed to delete file from storage: ${document.fileName}`, error);
      }
    }

    lead.documents.splice(documentIndex, 1);
    return lead.save();
  }

  async importLeads(importDto: ImportLeadsDto, createdBy: string): Promise<ImportLeadsResponseDto> {
    const MAX_ROWS = 100000;
    if (importDto.rows.length > MAX_ROWS) {
      throw new BadRequestException(`Import limited to ${MAX_ROWS.toLocaleString()} rows. Please split your file.`);
    }

    const result: ImportLeadsResponseDto = {
      totalRowsProcessed: importDto.rows.length,
      createdCount: 0,
      duplicateCount: 0,
      errors: [],
      createdIds: [],
      duplicates: [],
    };

    const createdByObjId = new Types.ObjectId(createdBy);

    // Process rows in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < importDto.rows.length; i += batchSize) {
      const batch = importDto.rows.slice(i, i + batchSize);
      
      for (const row of batch) {
        try {
          const rowData = row.data;
          const rowNum = parseInt(row.rowNumber, 10);

          // Require at least one identifier: phone, deal id, or email (PDR CSV has dealid + usually phone)
          const externalDealid = rowData.customFields?.external?.dealid ?? rowData.customFields?.dealId;
          const hasPhone = rowData.phone != null && String(rowData.phone).trim() !== '';
          const hasEmail = rowData.email != null && String(rowData.email).trim() !== '';
          if (!hasPhone && !externalDealid && !hasEmail) {
            result.errors.push({
              rowNumber: rowNum,
              message: 'Missing phone, customFields.external.dealid / dealId, or email',
            });
            continue;
          }

          // Normalize phone and address for dedupe
          const phoneNormalized = rowData.phone ? normalizePhone(rowData.phone) : undefined;
          const addressNormalized = rowData.address
            ? normalizeAddress(rowData.address)
            : undefined;

          // Check for duplicates: idempotent import by external.dealid or dealId first
          let duplicateLead: LeadDocument | null = null;
          if (externalDealid != null && String(externalDealid).trim() !== '') {
            duplicateLead = await this.leadModel
              .findOne({ 'customFields.external.dealid': externalDealid })
              .exec();
            if (!duplicateLead && rowData.customFields?.dealId !== undefined) {
              duplicateLead = await this.leadModel
                .findOne({ 'customFields.dealId': rowData.customFields.dealId })
                .exec();
            }
          }
          // Primary dedupe: normalized phone
          if (!duplicateLead && phoneNormalized) {
            duplicateLead = await this.leadModel
              .findOne({ phoneNormalized })
              .exec();
          }
          // Secondary dedupe: normalized address
          if (!duplicateLead && addressNormalized) {
            duplicateLead = await this.leadModel
              .findOne({ addressNormalized })
              .exec();
          }
          // Tertiary dedupe: email
          if (!duplicateLead && hasEmail) {
            duplicateLead = await this.leadModel
              .findOne({ email: String(rowData.email).trim() })
              .exec();
          }

          if (duplicateLead) {
            result.duplicateCount++;
            result.duplicates.push({
              rowNumber: rowNum,
              duplicateOf: duplicateLead._id.toString(),
            });
            continue;
          }

          // Create new lead (use status mapping for enum; source stored as-is for PDR alignment)
          const statusMapped = mapImportStatus(rowData.status);
          const leadData: any = {
            firstName: rowData.firstName ?? '',
            lastName: rowData.lastName ?? '',
            email: rowData.email || undefined,
            phone: (rowData.phone && String(rowData.phone).trim()) ? String(rowData.phone).trim() : '',
            phoneNormalized: phoneNormalized || undefined,
            addressNormalized: addressNormalized || undefined,
            createdBy: createdByObjId,
            source: (rowData.source && String(rowData.source).trim()) ? String(rowData.source).trim() : (importDto.defaultSource || 'other'),
            status: statusMapped.status,
            priority: rowData.priority || 'medium',
          };
          if (statusMapped.legacyStatus !== undefined) {
            leadData.customFields = { ...(rowData.customFields || {}), legacyStatus: statusMapped.legacyStatus };
          }
          // If we didn't set customFields from legacyStatus, we'll set from rowData below

          if (rowData.company) leadData.company = rowData.company;
          if (rowData.jobTitle) leadData.jobTitle = rowData.jobTitle;
          if (rowData.notes) leadData.notes = rowData.notes;
          if (rowData.address) {
            leadData.address = rowData.address;
            leadData.addressNormalized = addressNormalized;
          }
          if (rowData.tags) leadData.tags = rowData.tags;
          if (rowData.score !== undefined) leadData.score = rowData.score;
          if (rowData.estimatedValue !== undefined) leadData.estimatedValue = rowData.estimatedValue;
          if (rowData.assignedTo) {
            leadData.assignedTo = new Types.ObjectId(rowData.assignedTo);
          }
          if (rowData.customFields && typeof rowData.customFields === 'object') {
            leadData.customFields = { ...rowData.customFields, ...(leadData.customFields || {}) };
          }

          const newLead = new this.leadModel(leadData);
          const savedLead = await newLead.save();

          result.createdCount++;
          result.createdIds.push(savedLead._id.toString());
        } catch (error: any) {
          const rowNum = parseInt(row.rowNumber, 10);
          result.errors.push({
            rowNumber: rowNum,
            message: error.message || 'Failed to import lead',
          });
        }
      }
    }

    return result;
  }

  async dryRunLeadsImport(importDto: ImportLeadsDto, createdBy?: string): Promise<DryRunLeadsResponseDto> {
    const MAX_ROWS = 100000;
    if (importDto.rows.length > MAX_ROWS) {
      throw new BadRequestException(`Import limited to ${MAX_ROWS.toLocaleString()} rows. Please split your file.`);
    }
    const dryRunImportId = uuidv4();
    const result: DryRunLeadsResponseDto = {
      createdCount: 0,
      duplicateCount: 0,
      errors: [],
      created: [],
      duplicates: [],
    };
    for (const row of importDto.rows) {
      const rowData = row.data;
      const rowNum = parseInt(row.rowNumber, 10);
      const externalDealid = rowData.customFields?.external?.dealid ?? rowData.customFields?.dealId;
      const hasPhone = rowData.phone != null && String(rowData.phone).trim() !== '';
      const hasEmail = rowData.email != null && String(rowData.email).trim() !== '';
      if (!hasPhone && !externalDealid && !hasEmail) {
        result.errors.push({ rowNumber: rowNum, message: 'Missing phone, customFields.external.dealid / dealId, or email' });
        continue;
      }
      const phoneNormalized = rowData.phone ? normalizePhone(rowData.phone) : undefined;
      const addressNormalized = rowData.address ? normalizeAddress(rowData.address) : undefined;
      let duplicateLead: LeadDocument | null = null;
      if (externalDealid) {
        duplicateLead = await this.leadModel.findOne({ 'customFields.external.dealid': externalDealid }).exec();
      }
      if (!duplicateLead && externalDealid === undefined && rowData.customFields?.dealId) {
        duplicateLead = await this.leadModel.findOne({ 'customFields.dealId': rowData.customFields.dealId }).exec();
      }
      if (!duplicateLead && phoneNormalized) {
        duplicateLead = await this.leadModel.findOne({ phoneNormalized }).exec();
      }
      if (!duplicateLead && addressNormalized) {
        duplicateLead = await this.leadModel.findOne({ addressNormalized }).exec();
      }
      if (!duplicateLead && hasEmail) {
        duplicateLead = await this.leadModel.findOne({ email: String(rowData.email).trim() }).exec();
      }
      if (duplicateLead) {
        result.duplicateCount++;
        result.duplicates.push({ rowNumber: rowNum, duplicateOf: duplicateLead._id.toString() });
        continue;
      }
      const statusMapped = mapImportStatus(rowData.status);
      const leadData: any = {
        firstName: rowData.firstName ?? '',
        lastName: rowData.lastName ?? '',
        email: rowData.email || undefined,
        phone: rowData.phone ?? '',
        phoneNormalized,
        addressNormalized: addressNormalized || undefined,
        source: rowData.source || importDto.defaultSource || 'other',
        status: statusMapped.status,
        priority: rowData.priority || 'medium',
      };
      if (rowData.company) leadData.company = rowData.company;
      if (rowData.jobTitle) leadData.jobTitle = rowData.jobTitle;
      if (rowData.notes) leadData.notes = stripHtml(rowData.notes);
      if (rowData.address) {
        leadData.address = rowData.address;
        leadData.addressNormalized = addressNormalized;
      }
      if (rowData.tags) leadData.tags = rowData.tags;
      if (rowData.score !== undefined) leadData.score = rowData.score;
      if (rowData.estimatedValue !== undefined) leadData.estimatedValue = rowData.estimatedValue;
      if (rowData.customFields && typeof rowData.customFields === 'object') {
        leadData.customFields = { ...rowData.customFields };
      } else {
        leadData.customFields = {};
      }
      if (statusMapped.legacyStatus !== undefined) {
        leadData.customFields.legacyStatus = statusMapped.legacyStatus;
      }
      if (externalDealid != null && String(externalDealid).trim() !== '') {
        leadData.customFields.external = leadData.customFields.external || {};
        leadData.customFields.external.dealid = String(externalDealid).trim();
      }
      result.createdCount++;
      result.created.push({ rowNumber: rowNum, data: leadData });
    }
    const errorCount = result.errors.length;
    if (createdBy) {
      try {
        await this.importRunModel.create({
          importId: dryRunImportId,
          createdBy: new Types.ObjectId(createdBy),
          status: 'dry_run',
          createdCount: result.createdCount,
          duplicateCount: result.duplicateCount,
          errorCount,
          preset: importDto.preset,
        });
      } catch {
        // Don't fail dry-run if ImportRun save fails
      }
    }
    return result;
  }

  async commitLeadsImport(importDto: ImportLeadsDto, createdBy: string): Promise<ImportLeadsResponseDto> {
    const MAX_ROWS = 100000;
    const COMMIT_CHUNK_SIZE = 200;
    if (importDto.rows.length > MAX_ROWS) {
      throw new BadRequestException(`Import limited to ${MAX_ROWS.toLocaleString()} rows. Please split your file.`);
    }
    const importId = uuidv4();
    const result: ImportLeadsResponseDto = {
      totalRowsProcessed: importDto.rows.length,
      createdCount: 0,
      duplicateCount: 0,
      errors: [],
      createdIds: [],
      duplicates: [],
      importId,
    };
    const createdByObjId = new Types.ObjectId(createdBy);
    for (let i = 0; i < importDto.rows.length; i += COMMIT_CHUNK_SIZE) {
      const batch = importDto.rows.slice(i, i + COMMIT_CHUNK_SIZE);
      for (const row of batch) {
        try {
          const rowData = row.data;
          const rowNum = parseInt(row.rowNumber, 10);
          const externalDealid = rowData.customFields?.external?.dealid ?? rowData.customFields?.dealId;
          if (!rowData.phone && !externalDealid) {
            result.errors.push({ rowNumber: rowNum, message: 'Missing phone or customFields.external.dealid / dealId' });
            continue;
          }
          const phoneNormalized = rowData.phone ? normalizePhone(rowData.phone) : undefined;
          const addressNormalized = rowData.address ? normalizeAddress(rowData.address) : undefined;
          let duplicateLead: LeadDocument | null = null;
          if (externalDealid) {
            duplicateLead = await this.leadModel.findOne({ 'customFields.external.dealid': externalDealid }).exec();
          }
          if (!duplicateLead && externalDealid === undefined && rowData.customFields?.dealId) {
            duplicateLead = await this.leadModel.findOne({ 'customFields.dealId': rowData.customFields.dealId }).exec();
          }
          if (!duplicateLead && phoneNormalized) {
            duplicateLead = await this.leadModel.findOne({ phoneNormalized }).exec();
          }
          if (!duplicateLead && addressNormalized) {
            duplicateLead = await this.leadModel.findOne({ addressNormalized }).exec();
          }
          if (duplicateLead) {
            result.duplicateCount++;
            result.duplicates.push({ rowNumber: rowNum, duplicateOf: duplicateLead._id.toString() });
            continue;
          }
          const statusMapped = mapImportStatus(rowData.status);
          const leadData: any = {
            firstName: rowData.firstName ?? '',
            lastName: rowData.lastName ?? '',
            email: rowData.email || undefined,
            phone: rowData.phone ?? '',
            phoneNormalized,
            addressNormalized: addressNormalized || undefined,
            createdBy: createdByObjId,
            source: rowData.source || importDto.defaultSource || 'other',
            status: statusMapped.status,
            priority: rowData.priority || 'medium',
          };
          if (rowData.company) leadData.company = rowData.company;
          if (rowData.jobTitle) leadData.jobTitle = rowData.jobTitle;
          if (rowData.notes) leadData.notes = stripHtml(rowData.notes);
          if (rowData.address) {
            leadData.address = rowData.address;
            leadData.addressNormalized = addressNormalized;
          }
          if (rowData.tags) leadData.tags = rowData.tags;
          if (rowData.score !== undefined) leadData.score = rowData.score;
          if (rowData.estimatedValue !== undefined) leadData.estimatedValue = rowData.estimatedValue;
          if (rowData.assignedTo) leadData.assignedTo = new Types.ObjectId(rowData.assignedTo);
          if (rowData.customFields && typeof rowData.customFields === 'object') {
            leadData.customFields = { ...rowData.customFields };
          } else {
            leadData.customFields = {};
          }
          if (statusMapped.legacyStatus !== undefined) {
            leadData.customFields.legacyStatus = statusMapped.legacyStatus;
          }
          if (externalDealid != null && String(externalDealid).trim() !== '') {
            leadData.customFields.external = leadData.customFields.external || {};
            leadData.customFields.external.dealid = String(externalDealid).trim();
          }
          const newLead = new this.leadModel(leadData);
          const savedLead = await newLead.save();
          result.createdCount++;
          result.createdIds.push(savedLead._id.toString());

          const notesText = stripHtml(rowData.notes);
          if (importDto.createNoteEvents && notesText && notesText.trim()) {
            try {
              await this.leadEventsService.createEvent(
                savedLead._id.toString(),
                LeadEventType.NOTE_ADDED,
                createdBy,
                { text: notesText.trim(), source: 'import' },
              );
            } catch {
              // Don't fail the import if event creation fails
            }
          }
        } catch (error: any) {
          result.errors.push({
            rowNumber: parseInt(row.rowNumber, 10),
            message: error.message || 'Failed to import lead',
          });
        }
      }
    }
    const errorCount = result.errors.length;
    try {
      await this.importRunModel.create({
        importId,
        createdBy: createdByObjId,
        status: 'committed',
        createdCount: result.createdCount,
        duplicateCount: result.duplicateCount,
        errorCount,
        preset: importDto.preset,
      });
    } catch {
      // Don't fail commit if ImportRun save fails
    }
    return result;
  }

  async addNote(id: string, addNoteDto: AddNoteDto, userId: string): Promise<Lead> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid lead ID');
    }

    const lead = await this.leadModel.findById(id).exec();
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Create NOTE_ADDED event
    await this.leadEventsService.createEvent(
      id,
      LeadEventType.NOTE_ADDED,
      userId,
      {
        note: addNoteDto.note,
      },
    );

    // Update lead notes if it exists, otherwise append to existing notes
    const currentNotes = lead.notes || '';
    const updatedNotes = currentNotes
      ? `${currentNotes}\n\n${addNoteDto.note}`
      : addNoteDto.note;

    lead.notes = updatedNotes;
    return await lead.save();
  }

  async updateStatus(id: string, updateStatusDto: UpdateStatusDto, userId: string): Promise<Lead> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid lead ID');
    }

    const lead = await this.leadModel.findById(id).exec();
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const oldStatus = lead.status;
    lead.status = updateStatusDto.status;
    const updatedLead = await lead.save();

    // Create STATUS_CHANGED event
    await this.leadEventsService.createEvent(
      id,
      LeadEventType.STATUS_CHANGED,
      userId,
      {
        oldStatus,
        newStatus: updateStatusDto.status,
      },
    );

    return updatedLead;
  }

  async assignLead(id: string, assignDto: AssignLeadDto, userId: string): Promise<Lead> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid lead ID');
    }

    const lead = await this.leadModel.findById(id).exec();
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const oldAssignedTo = lead.assignedTo?.toString() || null;
    const newAssignedTo = assignDto.assignedTo || null;

    if (assignDto.assignedTo) {
      lead.assignedTo = new Types.ObjectId(assignDto.assignedTo);
    } else {
      lead.assignedTo = undefined;
    }

    const updatedLead = await lead.save();

    // Create ASSIGNED event
    await this.leadEventsService.createEvent(
      id,
      LeadEventType.ASSIGNED,
      userId,
      {
        oldAssignedTo,
        newAssignedTo,
      },
    );

    return updatedLead;
  }

  async getEvents(leadId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(leadId)) {
      throw new BadRequestException('Invalid lead ID');
    }

    return await this.leadEventsService.getEventsByLeadId(leadId);
  }
}
