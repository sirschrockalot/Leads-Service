import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name, 'leads') private leadModel: Model<LeadDocument>,
  ) {}

  async create(createLeadDto: CreateLeadDto, createdBy: string): Promise<Lead> {
    try {
      const lead = new this.leadModel({
        ...createLeadDto,
        createdBy: new Types.ObjectId(createdBy),
        assignedTo: createLeadDto.assignedTo ? new Types.ObjectId(createLeadDto.assignedTo) : undefined,
      });

      return await lead.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('Lead with this email already exists');
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

  async findOne(id: string): Promise<Lead> {
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

  async update(id: string, updateLeadDto: UpdateLeadDto): Promise<Lead> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid lead ID');
    }

    const updateData: any = { ...updateLeadDto };
    
    if (updateLeadDto.assignedTo) {
      updateData.assignedTo = new Types.ObjectId(updateLeadDto.assignedTo);
    }

    const lead = await this.leadModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!lead) {
      throw new NotFoundException('Lead not found');
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
}
