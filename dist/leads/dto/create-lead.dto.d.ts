import { LeadStatus, LeadSource, LeadPriority } from '../schemas/lead.schema';
export declare class CreateLeadDto {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company?: string;
    jobTitle?: string;
    status?: LeadStatus;
    source: LeadSource;
    priority?: LeadPriority;
    notes?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    customFields?: Record<string, any>;
    assignedTo?: string;
    lastContactDate?: string;
    nextFollowUpDate?: string;
    score?: number;
    tags?: string[];
    estimatedValue?: number;
}
