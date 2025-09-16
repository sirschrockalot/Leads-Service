"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const lead_schema_1 = require("./schemas/lead.schema");
let LeadsService = class LeadsService {
    constructor(leadModel) {
        this.leadModel = leadModel;
    }
    async create(createLeadDto, createdBy) {
        try {
            const lead = new this.leadModel({
                ...createLeadDto,
                createdBy: new mongoose_2.Types.ObjectId(createdBy),
                assignedTo: createLeadDto.assignedTo ? new mongoose_2.Types.ObjectId(createLeadDto.assignedTo) : undefined,
            });
            return await lead.save();
        }
        catch (error) {
            if (error.code === 11000) {
                throw new common_1.BadRequestException('Lead with this email already exists');
            }
            throw error;
        }
    }
    async findAll(query) {
        const { search, status, source, priority, assignedTo, createdBy, tags, minScore, maxScore, minEstimatedValue, maxEstimatedValue, startDate, endDate, lastContactStartDate, lastContactEndDate, nextFollowUpStartDate, nextFollowUpEndDate, isActive, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const filter = {};
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } },
            ];
        }
        if (status) {
            filter.status = status;
        }
        if (source) {
            filter.source = source;
        }
        if (priority) {
            filter.priority = priority;
        }
        if (assignedTo) {
            filter.assignedTo = new mongoose_2.Types.ObjectId(assignedTo);
        }
        if (createdBy) {
            filter.createdBy = new mongoose_2.Types.ObjectId(createdBy);
        }
        if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim());
            filter.tags = { $in: tagArray };
        }
        if (minScore !== undefined || maxScore !== undefined) {
            filter.score = {};
            if (minScore !== undefined)
                filter.score.$gte = minScore;
            if (maxScore !== undefined)
                filter.score.$lte = maxScore;
        }
        if (minEstimatedValue !== undefined || maxEstimatedValue !== undefined) {
            filter.estimatedValue = {};
            if (minEstimatedValue !== undefined)
                filter.estimatedValue.$gte = minEstimatedValue;
            if (maxEstimatedValue !== undefined)
                filter.estimatedValue.$lte = maxEstimatedValue;
        }
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate)
                filter.createdAt.$gte = new Date(startDate);
            if (endDate)
                filter.createdAt.$lte = new Date(endDate);
        }
        if (lastContactStartDate || lastContactEndDate) {
            filter.lastContactDate = {};
            if (lastContactStartDate)
                filter.lastContactDate.$gte = new Date(lastContactStartDate);
            if (lastContactEndDate)
                filter.lastContactDate.$lte = new Date(lastContactEndDate);
        }
        if (nextFollowUpStartDate || nextFollowUpEndDate) {
            filter.nextFollowUpDate = {};
            if (nextFollowUpStartDate)
                filter.nextFollowUpDate.$gte = new Date(nextFollowUpStartDate);
            if (nextFollowUpEndDate)
                filter.nextFollowUpDate.$lte = new Date(nextFollowUpEndDate);
        }
        if (isActive !== undefined) {
            filter.isActive = isActive;
        }
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
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
    async findOne(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid lead ID');
        }
        const lead = await this.leadModel
            .findById(id)
            .populate('assignedTo', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email')
            .exec();
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        return lead;
    }
    async update(id, updateLeadDto) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid lead ID');
        }
        const updateData = { ...updateLeadDto };
        if (updateLeadDto.assignedTo) {
            updateData.assignedTo = new mongoose_2.Types.ObjectId(updateLeadDto.assignedTo);
        }
        const lead = await this.leadModel
            .findByIdAndUpdate(id, updateData, { new: true })
            .populate('assignedTo', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email')
            .exec();
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        return lead;
    }
    async remove(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid lead ID');
        }
        const result = await this.leadModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new common_1.NotFoundException('Lead not found');
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
    async bulkUpdate(ids, updateData) {
        const validIds = ids.filter(id => mongoose_2.Types.ObjectId.isValid(id));
        const invalidIds = ids.filter(id => !mongoose_2.Types.ObjectId.isValid(id));
        const result = await this.leadModel.updateMany({ _id: { $in: validIds.map(id => new mongoose_2.Types.ObjectId(id)) } }, updateData);
        return {
            updated: result.modifiedCount,
            failed: invalidIds
        };
    }
    async bulkDelete(ids) {
        const validIds = ids.filter(id => mongoose_2.Types.ObjectId.isValid(id));
        const invalidIds = ids.filter(id => !mongoose_2.Types.ObjectId.isValid(id));
        const result = await this.leadModel.deleteMany({
            _id: { $in: validIds.map(id => new mongoose_2.Types.ObjectId(id)) }
        });
        return {
            deleted: result.deletedCount,
            failed: invalidIds
        };
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(lead_schema_1.Lead.name, 'leads')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], LeadsService);
//# sourceMappingURL=leads.service.js.map