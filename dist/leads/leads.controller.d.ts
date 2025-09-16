import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
export declare class LeadsController {
    private readonly leadsService;
    constructor(leadsService: LeadsService);
    create(createLeadDto: CreateLeadDto, req: any): Promise<import("./schemas/lead.schema").Lead>;
    findAll(query: LeadQueryDto): Promise<{
        data: Omit<Omit<import("mongoose").Document<unknown, {}, import("./schemas/lead.schema").LeadDocument> & import("./schemas/lead.schema").Lead & import("mongoose").Document<any, any, any> & {
            _id: import("mongoose").Types.ObjectId;
        }, never>, never>[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getStats(): Promise<any>;
    findOne(id: string): Promise<import("./schemas/lead.schema").Lead>;
    update(id: string, updateLeadDto: UpdateLeadDto): Promise<import("./schemas/lead.schema").Lead>;
    remove(id: string): Promise<void>;
    bulkUpdate(body: {
        ids: string[];
        updateData: Partial<UpdateLeadDto>;
    }): Promise<{
        updated: number;
        failed: string[];
    }>;
    bulkDelete(body: {
        ids: string[];
    }): Promise<{
        deleted: number;
        failed: string[];
    }>;
}
