import { LeadStatus, LeadSource, LeadPriority } from '../schemas/lead.schema';
export declare class LeadQueryDto {
    search?: string;
    status?: LeadStatus;
    source?: LeadSource;
    priority?: LeadPriority;
    assignedTo?: string;
    createdBy?: string;
    tags?: string;
    minScore?: number;
    maxScore?: number;
    minEstimatedValue?: number;
    maxEstimatedValue?: number;
    startDate?: string;
    endDate?: string;
    lastContactStartDate?: string;
    lastContactEndDate?: string;
    nextFollowUpStartDate?: string;
    nextFollowUpEndDate?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
