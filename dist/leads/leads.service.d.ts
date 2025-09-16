import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
export declare class LeadsService {
    private leadModel;
    constructor(leadModel: Model<LeadDocument>);
    create(createLeadDto: CreateLeadDto, createdBy: string): Promise<Lead>;
    findAll(query: LeadQueryDto): Promise<{
        data: Omit<Omit<import("mongoose").Document<unknown, {}, LeadDocument> & Lead & import("mongoose").Document<any, any, any> & {
            _id: Types.ObjectId;
        }, never>, never>[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    findOne(id: string): Promise<Lead>;
    update(id: string, updateLeadDto: UpdateLeadDto): Promise<Lead>;
    remove(id: string): Promise<void>;
    getStats(): Promise<any>;
    bulkUpdate(ids: string[], updateData: Partial<UpdateLeadDto>): Promise<{
        updated: number;
        failed: string[];
    }>;
    bulkDelete(ids: string[]): Promise<{
        deleted: number;
        failed: string[];
    }>;
}
